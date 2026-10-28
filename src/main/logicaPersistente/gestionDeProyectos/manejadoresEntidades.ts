import type { ManejadorEntidad } from './edicionCompartida';
import type { CambioPendiente } from './entidades';
import type { IPersistenciaProyectos } from './interfacesSincronizacion';

type Payload = { idGlobal?: string; datos?: Record<string, any> };

async function usuarioPorMail(p: IPersistenciaProyectos, mail: string | null | undefined): Promise<number | null> {
  if (!mail) return null;
  const f = await p.ejecutar(`SELECT id_usuario FROM usuarios WHERE LOWER(email) = LOWER($1)`, [mail]);
  return f[0]?.id_usuario ?? null;
}

// Creador: si su mail no existe en esta base, se usa el usuario con sesión (no puede quedar NULL).
async function resolverCreador(
  p: IPersistenciaProyectos, mail: string | undefined, porDefecto: () => number | null,
): Promise<number> {
  const id = await usuarioPorMail(p, mail);
  if (id !== null) return id;
  const sesion = porDefecto();
  if (sesion === null) throw new Error('No hay usuario local para asignar el elemento.');
  return sesion;
}

/* ============================ EVENTOS ============================ */

export class ManejadorEvento implements ManejadorEntidad {
  constructor(private p: IPersistenciaProyectos, private usuarioSesion: () => number | null) {}

  async leer(idProyecto: number, idGlobal: string) {
    const f = await this.p.ejecutar(
      `SELECT (to_jsonb(e) - 'id' - 'usuario_id' - 'id_proyecto' - 'id_global')
              || jsonb_build_object('creador_mail', u.email) AS datos
       FROM eventos e LEFT JOIN usuarios u ON u.id_usuario = e.usuario_id
       WHERE e.id_global = $1 AND e.id_proyecto = $2`, [idGlobal, idProyecto]);
    return f[0] ? { datos: f[0].datos } : null;
  }

  async aplicarCambio(idProyecto: number, cambio: CambioPendiente): Promise<void> {
    const { idGlobal, datos: d } = (cambio.payload ?? {}) as Payload;
    if (!idGlobal) return;
    if (cambio.operacion === 'eliminar') {
      await this.p.ejecutar(`DELETE FROM eventos WHERE id_global = $1 AND id_proyecto = $2`, [idGlobal, idProyecto]);
      return;
    }
    if (!d || !d.titulo) return; // 'crear' de la cola sin datos: llega completo por el camino de versiones
    const idUsuario = await resolverCreador(this.p, d.creador_mail, this.usuarioSesion);
    await this.p.ejecutar(
      `INSERT INTO eventos (id_global, usuario_id, id_proyecto, titulo, descripcion, lugar, fecha,
                            categoria, prioridad, notificaciones_activas, recordatorios)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
       ON CONFLICT (id_global) DO UPDATE SET
         titulo = EXCLUDED.titulo, descripcion = EXCLUDED.descripcion, lugar = EXCLUDED.lugar,
         fecha = EXCLUDED.fecha, categoria = EXCLUDED.categoria, prioridad = EXCLUDED.prioridad,
         notificaciones_activas = EXCLUDED.notificaciones_activas, recordatorios = EXCLUDED.recordatorios`,
      [idGlobal, idUsuario, idProyecto, d.titulo, d.descripcion ?? null, d.lugar ?? null, d.fecha,
       d.categoria ?? 'Otro', d.prioridad ?? 'media', d.notificaciones_activas ?? false,
       JSON.stringify(d.recordatorios ?? [])]);
  }
}

/* ============================ METAS ============================ */
/*
 * Esquema real: metas.id_meta_origen apunta a la meta de la que se copió esta (no existe "trasladada_a").
 * Por la red viaja como `origen_global` (el id_global de la meta de origen), porque los id locales difieren entre PCs.
 */

export class ManejadorMeta implements ManejadorEntidad {
  constructor(private p: IPersistenciaProyectos, private usuarioSesion: () => number | null) {}

  async leer(idProyecto: number, idGlobal: string) {
    const f = await this.p.ejecutar(
      `SELECT (to_jsonb(m) - 'id_meta' - 'creada_por' - 'id_proyecto' - 'id_global'
                           - 'id_meta_origen' - 'completada_por')
              || jsonb_build_object('creador_mail', uc.email,
                                    'completada_por_mail', ur.email,
                                    'origen_global', mo.id_global) AS datos
       FROM metas m
       LEFT JOIN usuarios uc ON uc.id_usuario = m.creada_por
       LEFT JOIN usuarios ur ON ur.id_usuario = m.completada_por
       LEFT JOIN metas mo ON mo.id_meta = m.id_meta_origen
       WHERE m.id_global = $1 AND m.id_proyecto = $2`, [idGlobal, idProyecto]);
    return f[0] ? { datos: f[0].datos } : null;
  }

  async aplicarCambio(idProyecto: number, cambio: CambioPendiente): Promise<void> {
    const { idGlobal, datos: d } = (cambio.payload ?? {}) as Payload;
    if (!idGlobal) return;
    if (cambio.operacion === 'eliminar') {
      await this.p.ejecutar(`DELETE FROM metas WHERE id_global = $1 AND id_proyecto = $2`, [idGlobal, idProyecto]);
      return;
    }
    if (!d || !d.titulo) return; // 'crear' de la cola sin datos: llega completo por el camino de versiones
    const creadaPor = await resolverCreador(this.p, d.creador_mail, this.usuarioSesion);
    const completadaPor = await usuarioPorMail(this.p, d.completada_por_mail);
    await this.p.ejecutar(
      `INSERT INTO metas (id_global, id_proyecto, titulo, descripcion, mes, orden, completada,
                          fecha_completada, completada_por, id_meta_origen, creada_por, fecha_limite)
       VALUES ($1,$2,$3,$4,$5::date,$6,$7,$8,$9,
               (SELECT id_meta FROM metas WHERE id_global = $10::uuid), $11, $12::date)
       ON CONFLICT (id_global) DO UPDATE SET
         titulo = EXCLUDED.titulo, descripcion = EXCLUDED.descripcion, mes = EXCLUDED.mes,
         fecha_limite = EXCLUDED.fecha_limite,
         orden = EXCLUDED.orden, completada = EXCLUDED.completada,
         fecha_completada = EXCLUDED.fecha_completada, completada_por = EXCLUDED.completada_por,
         id_meta_origen = COALESCE(EXCLUDED.id_meta_origen, metas.id_meta_origen)`,
      [idGlobal, idProyecto, d.titulo, d.descripcion ?? null, d.mes, d.orden ?? 0,
       d.completada ?? false, d.fecha_completada ?? null, completadaPor,
       d.origen_global ?? null, creadaPor, d.fecha_limite ?? null]);
  }
}

/* ============================ TAREAS ============================ */

export class ManejadorTarea implements ManejadorEntidad {
  constructor(private p: IPersistenciaProyectos, private usuarioSesion: () => number | null) {}

  async leer(idProyecto: number, idGlobal: string) {
    const f = await this.p.ejecutar(
      `SELECT (to_jsonb(t) - 'id_tarea' - 'id_proyecto' - 'id_global'
                           - 'creada_por' - 'id_asignado' - 'completada_por')
              || jsonb_build_object('creador_mail', uc.email,
                                    'asignado_mail', ua.email,
                                    'completada_por_mail', ur.email) AS datos
       FROM tareas t
       LEFT JOIN usuarios uc ON uc.id_usuario = t.creada_por
       LEFT JOIN usuarios ua ON ua.id_usuario = t.id_asignado
       LEFT JOIN usuarios ur ON ur.id_usuario = t.completada_por
       WHERE t.id_global = $1 AND t.id_proyecto = $2`, [idGlobal, idProyecto]);
    return f[0] ? { datos: f[0].datos } : null;
  }

  async aplicarCambio(idProyecto: number, cambio: CambioPendiente): Promise<void> {
    const { idGlobal, datos: d } = (cambio.payload ?? {}) as Payload;
    if (!idGlobal) return;
    if (cambio.operacion === 'eliminar') {
      await this.p.ejecutar(`DELETE FROM tareas WHERE id_global = $1 AND id_proyecto = $2`, [idGlobal, idProyecto]);
      return;
    }
    if (!d || !d.titulo) return;
    const creadaPor = await resolverCreador(this.p, d.creador_mail, this.usuarioSesion);
    // Asignado y quien la completó: si el mail no existe en esta base queda NULL (no se asigna a otra persona).
    const asignado = await usuarioPorMail(this.p, d.asignado_mail);
    const completadaPor = await usuarioPorMail(this.p, d.completada_por_mail);
    await this.p.ejecutar(
      `INSERT INTO tareas (id_global, id_proyecto, titulo, descripcion, prioridad, fecha_limite,
                           id_asignado, orden, completada, fecha_completada, completada_por, creada_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id_global) DO UPDATE SET
         titulo = EXCLUDED.titulo, descripcion = EXCLUDED.descripcion, prioridad = EXCLUDED.prioridad,
         fecha_limite = EXCLUDED.fecha_limite, id_asignado = EXCLUDED.id_asignado,
         orden = EXCLUDED.orden, completada = EXCLUDED.completada,
         fecha_completada = EXCLUDED.fecha_completada, completada_por = EXCLUDED.completada_por`,
      [idGlobal, idProyecto, d.titulo, d.descripcion ?? null, d.prioridad ?? 'media', d.fecha_limite ?? null,
       asignado, d.orden ?? 0, d.completada ?? false, d.fecha_completada ?? null, completadaPor, creadaPor]);
  }
}