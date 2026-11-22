import { Persistencia } from '../../persistencia/persistencia';

// Cuántos días hacia adelante ve la IA (un parcial suele estar a 2 o 3 semanas).
const DIAS_ADELANTE = 21;
const MAX_ARCHIVOS_POR_MATERIA = 12;
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Las fechas se muestran en la hora de la compu: el proceso principal corre en la compu del usuario.
const dia = (f: Date) => `${DIAS[f.getDay()]} ${f.getDate()}/${f.getMonth() + 1}`;
const hora = (f: Date) => `${String(f.getHours()).padStart(2, '0')}:${String(f.getMinutes()).padStart(2, '0')}`;
const fecha = (valor: Date | string) => new Date(valor);
// Las columnas DATE llegan como Date a las 00:00 locales.
const soloDia = (valor: Date | string) => dia(fecha(valor));
const horas = (minutos: number) => (minutos >= 60 ? `${Math.floor(minutos / 60)} h${minutos % 60 ? ` ${minutos % 60} min` : ''}` : `${minutos} min`);

const seccion = (titulo: string, lineas: string[], vacio: string) => `${titulo}:\n${lineas.length ? lineas.map((l) => `- ${l}`).join('\n') : `- ${vacio}`}`;

// Resumen en texto de la agenda y el material del usuario para el chat con IA: hoy, clases, eventos,
// sesiones de estudio, tareas, metas, repasos pendientes, cómo le va y el material de lo que cursa.
// La IA lo usa para responder "¿qué tengo esta semana?" y para sugerir cómo organizarse.
export class AgendaParaIA {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(idUsuario: number, ahora: Date = new Date()): Promise<string> {
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const hasta = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + DIAS_ADELANTE + 1);
    const p = [idUsuario, hoy, hasta];

    const [clases, eventos, sesiones, estudiado, tareas, metas, mazos, temas, material] = await Promise.all([
      this.persistencia.ejecutar(
        // Clases del cuatrimestre que se cursa en estas semanas (y las cargadas antes de los cuatrimestres),
        // con el fin de la cursada y los feriados o recesos que caen en el período.
        `SELECT h.dia_semana, h.hora_inicio, h.hora_fin, h.titulo, to_char(c.fecha_fin, 'DD/MM') AS hasta_fecha,
                (SELECT string_agg(to_char(r.desde, 'DD/MM')
                                   || CASE WHEN r.hasta > r.desde THEN ' al ' || to_char(r.hasta, 'DD/MM') ELSE '' END, ', ')
                   FROM cuatrimestre_receso r
                  WHERE r.id_cuatrimestre = c.id_cuatrimestre AND r.hasta >= $2::date AND r.desde < $3::date) AS recesos
           FROM horarios_cursado h LEFT JOIN cuatrimestre c ON c.id_cuatrimestre = h.id_cuatrimestre
          WHERE h.usuario_id = $1 AND (c.id_cuatrimestre IS NULL OR (c.fecha_inicio < $3::date AND c.fecha_fin >= $2::date))
          ORDER BY h.dia_semana, h.hora_inicio`,
        p
      ),
      this.persistencia.ejecutar(
        `SELECT e.titulo, e.fecha, e.categoria, e.prioridad, e.lugar, p.nombre AS proyecto
           FROM eventos e LEFT JOIN proyectos p ON p.id_proyecto = e.id_proyecto
          WHERE (e.usuario_id = $1 OR e.id_proyecto IN (
                  SELECT id_proyecto FROM proyecto_miembros WHERE id_usuario = $1 AND fecha_baja IS NULL))
            AND e.fecha >= $2 AND e.fecha < $3
          ORDER BY e.fecha LIMIT 40`,
        p
      ),
      this.persistencia.ejecutar(
        `SELECT s.nombre, s.fecha_programada, s.duracion, s.estado, m.nombre AS materia,
                (SELECT string_agg(t.nombre, ', ') FROM sesion_estudio_metodo_estudio sm
                   JOIN tipo_metodo_estudio t ON t.id_tipo_metodo_estudio = sm.id_tipo_metodo_estudio
                  WHERE sm.id_sesion_estudio = s.id_sesion_estudio) AS metodos,
                (SELECT string_agg(o.descripcion, '; ' ORDER BY o.orden) FROM objetivo_sesion o
                  WHERE o.id_sesion_estudio = s.id_sesion_estudio AND NOT o.completado) AS objetivos
           FROM sesion_estudio s JOIN materia m ON m.id_materia = s.id_materia
          WHERE s.id_usuario = $1 AND s.estado <> 'completada'
            -- Las atrasadas, solo las de las últimas 2 semanas (las viejas ya no sirven para organizarse).
            AND ((s.estado = 'atrasada' AND s.fecha_programada >= $2::timestamptz - interval '14 days')
                 OR (s.fecha_programada >= $2 AND s.fecha_programada < $3))
          ORDER BY s.fecha_programada LIMIT 40`,
        p
      ),
      this.persistencia.ejecutar(
        `SELECT m.nombre AS materia,
                ROUND(SUM(GREATEST(0, EXTRACT(EPOCH FROM (s.fecha_fin - s.fecha_inicio)) - s.segundos_pausados)) / 60)::int AS minutos
           FROM sesion_estudio s JOIN materia m ON m.id_materia = s.id_materia
          WHERE s.id_usuario = $1 AND s.fecha_fin IS NOT NULL AND s.fecha_inicio >= $2::timestamptz - interval '14 days'
          GROUP BY m.nombre ORDER BY minutos DESC`,
        [idUsuario, hoy]
      ),
      this.persistencia.ejecutar(
        `SELECT t.titulo, t.fecha_limite, t.prioridad, p.nombre AS proyecto
           FROM tareas t LEFT JOIN proyectos p ON p.id_proyecto = t.id_proyecto
          WHERE NOT t.completada AND t.fecha_limite IS NOT NULL AND t.fecha_limite < $2
            AND (t.id_usuario = $1 OR t.id_asignado = $1
                 OR (t.id_asignado IS NULL AND t.id_asignado_global IS NULL AND t.id_proyecto IN (
                     SELECT id_proyecto FROM proyecto_miembros WHERE id_usuario = $1 AND fecha_baja IS NULL)))
          ORDER BY t.fecha_limite LIMIT 30`,
        [idUsuario, hasta]
      ),
      this.persistencia.ejecutar(
        `SELECT titulo, fecha_limite FROM metas
          WHERE id_usuario = $1 AND NOT completada AND mes = date_trunc('month', $2::date)::date
          ORDER BY fecha_limite NULLS LAST, orden LIMIT 20`,
        [idUsuario, hoy]
      ),
      this.persistencia.ejecutar(
        `SELECT d.nombre, COUNT(*)::int AS pendientes
           FROM flashcards f JOIN decks d ON d.id_deck = f.id_deck
          WHERE d.id_usuario = $1 AND f.proxima_revision <= $2::date + 7
          GROUP BY d.nombre ORDER BY pendientes DESC LIMIT 15`,
        [idUsuario, hoy]
      ),
      this.persistencia.ejecutar(
        `SELECT t.tema, SUM(t.errores)::int AS errores
           FROM intentos_cuestionario i
           CROSS JOIN LATERAL jsonb_to_recordset(i.temas_a_reforzar) AS t(tema text, errores int, total int)
          WHERE i.id_usuario = $1 AND i.fecha >= $2::timestamp - interval '60 days' AND t.errores > 0
          GROUP BY t.tema ORDER BY errores DESC LIMIT 8`,
        [idUsuario, hoy]
      ),
      // Material de las materias que cursa (o con sesiones programadas): carpetas asociadas y sus archivos.
      this.persistencia.ejecutar(
        `WITH RECURSIVE materias AS (
           SELECT m.id_materia, m.nombre FROM materia m JOIN formacion f ON f.id_formacion = m.id_formacion
            WHERE f.id_usuario = $1 AND m.estado = 'cursando'
           UNION
           SELECT m.id_materia, m.nombre FROM materia m JOIN sesion_estudio s ON s.id_materia = m.id_materia
            WHERE s.id_usuario = $1 AND s.estado <> 'completada' AND s.fecha_programada >= $2 AND s.fecha_programada < $3
         ), arbol AS (
           SELECT n.id_nodo, n.id_materia FROM nodos n JOIN materias ma ON ma.id_materia = n.id_materia
           UNION ALL
           SELECT h.id_nodo, a.id_materia FROM nodos h JOIN arbol a ON h.id_padre = a.id_nodo
         )
         SELECT ma.nombre AS materia,
                (SELECT string_agg(x.archivo, ', ') FROM (
                   SELECT DISTINCT ar.nombre || '.' || ar.extension AS archivo
                     FROM arbol a JOIN archivos ar ON ar.id_padre = a.id_nodo
                    WHERE a.id_materia = ma.id_materia
                    ORDER BY 1 LIMIT ${MAX_ARCHIVOS_POR_MATERIA}) x) AS archivos
           FROM materias ma ORDER BY ma.nombre`,
        p
      ),
    ]);

    const partes = [
      `HOY: ${dia(ahora)}/${ahora.getFullYear()}, ${hora(ahora)} hs.`,
      seccion('CLASES (se repiten cada semana)', clases.map((c) => `${DIAS[c.dia_semana]} ${c.hora_inicio} a ${c.hora_fin}: ${c.titulo}`
        + (c.hasta_fecha ? ` (hasta el ${c.hasta_fecha}${c.recesos ? `; sin clases: ${c.recesos}` : ''})` : '')), 'no cargó horarios de cursado'),
      seccion(
        `EVENTOS (próximos ${DIAS_ADELANTE} días)`,
        eventos.map((e) => {
          const f = fecha(e.fecha);
          const extra = [e.categoria, e.prioridad === 'importante' ? 'importante' : '', e.lugar ? `en ${e.lugar}` : '', e.proyecto ? `proyecto ${e.proyecto}` : '']
            .filter(Boolean).join(', ');
          return `${dia(f)} ${hora(f)}: ${e.titulo} (${extra})`;
        }),
        'no tiene eventos'
      ),
      seccion(
        'SESIONES DE ESTUDIO PROGRAMADAS',
        sesiones.map((s) => {
          const f = fecha(s.fecha_programada);
          const detalle = [s.metodos ? `métodos: ${s.metodos}` : '', s.objetivos ? `objetivos: ${s.objetivos}` : ''].filter(Boolean).join('; ');
          return `${s.estado === 'atrasada' ? '[ATRASADA] ' : ''}${dia(f)} ${hora(f)}, ${horas(s.duracion)}: ${s.materia} — ${s.nombre}${detalle ? ` (${detalle})` : ''}`;
        }),
        'no tiene sesiones programadas'
      ),
      seccion('ESTUDIADO EN LAS ÚLTIMAS 2 SEMANAS', estudiado.map((e) => `${e.materia}: ${horas(e.minutos)}`), 'no registró sesiones terminadas'),
      seccion('TAREAS DE PROYECTOS Y PERSONALES SIN TERMINAR', tareas.map((t) => `vence ${soloDia(t.fecha_limite)}: ${t.titulo} (prioridad ${t.prioridad}${t.proyecto ? `, proyecto ${t.proyecto}` : ''})`), 'no tiene tareas con fecha'),
      seccion('METAS DEL MES SIN CUMPLIR', metas.map((m) => `${m.titulo}${m.fecha_limite ? ` (vence ${soloDia(m.fecha_limite)})` : ''}`), 'no tiene metas pendientes'),
      seccion('FLASHCARDS PARA REPASAR ESTA SEMANA', mazos.map((m) => `mazo ${m.nombre}: ${m.pendientes} tarjetas`), 'no tiene repasos pendientes'),
      seccion('TEMAS A REFORZAR (errores en cuestionarios de los últimos 60 días)', temas.map((t) => `${t.tema}: ${t.errores} errores`), 'sin datos'),
      seccion('MATERIAL DE LAS MATERIAS QUE CURSA', material.map((m) => `${m.materia}: ${m.archivos ?? 'sin archivos en Material'}`), 'no tiene materias cursando'),
    ];
    return partes.join('\n\n');
  }
}
