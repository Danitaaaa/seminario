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

export class ManejadorMeta implements ManejadorEntidad {
  constructor(private p: IPersistenciaProyectos, _usuarioSesion?: () => number | null) {}

  async leer(idProyecto: number, idGlobal: string) {
    const f = await this.p.ejecutar(
      `SELECT (to_jsonb(m) - 'id_meta' - 'id_proyecto' - 'id_global' - 'id_meta_origen' - 'id_usuario')
       || jsonb_build_object('origen_global', mo.id_global) AS datos
       FROM metas m
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
    await this.p.ejecutar(
      `INSERT INTO metas (id_global, id_proyecto, titulo, descripcion, mes, orden, completada,
                          fecha_completada, id_meta_origen, fecha_limite)
       VALUES ($1,$2,$3,$4,$5::date,$6,$7,$8,
               (SELECT id_meta FROM metas WHERE id_global = $9::uuid), $10::date)
       ON CONFLICT (id_global) DO UPDATE SET
         titulo = EXCLUDED.titulo, descripcion = EXCLUDED.descripcion, mes = EXCLUDED.mes,
         fecha_limite = EXCLUDED.fecha_limite,
         orden = EXCLUDED.orden, completada = EXCLUDED.completada,
         fecha_completada = EXCLUDED.fecha_completada,
         id_meta_origen = COALESCE(EXCLUDED.id_meta_origen, metas.id_meta_origen)`,
      [idGlobal, idProyecto, d.titulo, d.descripcion ?? null, d.mes, d.orden ?? 0,
       d.completada ?? false, d.fecha_completada ?? null,
       d.origen_global ?? null, d.fecha_limite ?? null]);
  }
}

/* ============================ TAREAS ============================ */

export class ManejadorTarea implements ManejadorEntidad {
  constructor(private p: IPersistenciaProyectos, _usuarioSesion?: () => number | null) {}

  async leer(idProyecto: number, idGlobal: string) {
    const f = await this.p.ejecutar(
      `SELECT (to_jsonb(t) - 'id_tarea' - 'id_proyecto' - 'id_global' - 'id_usuario'
                           - 'id_asignado' - 'id_asignado_global')
              || jsonb_build_object('asignado_mail', ua.email) AS datos
       FROM tareas t
       LEFT JOIN proyecto_miembros pm
              ON pm.id_proyecto = t.id_proyecto
             AND ((t.id_asignado_global IS NOT NULL AND pm.id_global_usuario = t.id_asignado_global)
               OR (t.id_asignado IS NOT NULL AND pm.id_usuario = t.id_asignado))
       LEFT JOIN usuarios ua ON ua.id_usuario = pm.id_usuario
       WHERE t.id_global = $1 AND t.id_proyecto = $2
       LIMIT 1`, [idGlobal, idProyecto]);
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

    // Asignado: se busca por mail el miembro de ESTE proyecto. Si no existe, queda sin asignar.
    // Con uid global se guarda ese (proyecto compartido); si no, el id local (proyecto personal).
    let asignadoLocal: number | null = null;
    let asignadoGlobal: string | null = null;
    const idLocal = await usuarioPorMail(this.p, d.asignado_mail);
    if (idLocal !== null) {
      const m = await this.p.ejecutar(
        `SELECT id_global_usuario FROM proyecto_miembros
         WHERE id_proyecto = $1 AND id_usuario = $2
         ORDER BY fecha_baja NULLS FIRST, fecha_union DESC LIMIT 1`, [idProyecto, idLocal]);
      if (m[0]) {
        if (m[0].id_global_usuario) asignadoGlobal = m[0].id_global_usuario;
        else asignadoLocal = idLocal;
      }
    }

    await this.p.ejecutar(
      `INSERT INTO tareas (id_global, id_proyecto, titulo, descripcion, prioridad, fecha_limite,
                           fecha_inicio, id_asignado, id_asignado_global, orden, completada, fecha_completada)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id_global) DO UPDATE SET
         titulo = EXCLUDED.titulo, descripcion = EXCLUDED.descripcion, prioridad = EXCLUDED.prioridad,
         fecha_limite = EXCLUDED.fecha_limite, fecha_inicio = EXCLUDED.fecha_inicio,
         id_asignado = EXCLUDED.id_asignado, id_asignado_global = EXCLUDED.id_asignado_global,
         orden = EXCLUDED.orden, completada = EXCLUDED.completada,
         fecha_completada = EXCLUDED.fecha_completada`,
      [idGlobal, idProyecto, d.titulo, d.descripcion ?? null, d.prioridad ?? 'media', d.fecha_limite ?? null,
       d.fecha_inicio ?? null, asignadoLocal, asignadoGlobal, d.orden ?? 0,
       d.completada ?? false, d.fecha_completada ?? null]);
  }
}