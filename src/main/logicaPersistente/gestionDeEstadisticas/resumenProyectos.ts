import { Persistencia } from '../../persistencia/persistencia';
import { ResumenProyecto } from './entidades';
import { ResumenProyectosDTO } from './dto';
import { materializarAporte, materializarResumenProyecto } from './materializador';

// Para cada proyecto del que el usuario es integrante: cómo van las tareas,
// las metas del mes y cuánto aportó cada integrante.
export class ResumenProyectos {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: ResumenProyectosDTO): Promise<ResumenProyecto[]> {
    const proyectos = await this.persistencia.ejecutar(
      `SELECT p.id_proyecto, p.nombre,
              (SELECT COUNT(*) FROM tareas t WHERE t.id_proyecto = p.id_proyecto)::int AS total,
              (SELECT COUNT(*) FROM tareas t WHERE t.id_proyecto = p.id_proyecto AND t.completada)::int AS hechas,
              (SELECT COUNT(*) FROM tareas t WHERE t.id_proyecto = p.id_proyecto AND NOT t.completada)::int AS pendientes,
              (SELECT COUNT(*) FROM tareas t WHERE t.id_proyecto = p.id_proyecto AND NOT t.completada
                 AND t.fecha_limite < $2::date)::int AS vencidas,
              (SELECT COUNT(*) FROM tareas t WHERE t.id_proyecto = p.id_proyecto AND NOT t.completada
                 AND t.id_asignado IS NULL)::int AS sin_asignar,
              (SELECT COUNT(*) FROM metas mt WHERE mt.id_proyecto = p.id_proyecto
                 AND mt.mes = ($3 || '-01')::date)::int AS metas_total,
              (SELECT COUNT(*) FROM metas mt WHERE mt.id_proyecto = p.id_proyecto
                 AND mt.mes = ($3 || '-01')::date AND mt.completada)::int AS metas_completadas
         FROM proyectos p
         JOIN proyecto_miembros m ON m.id_proyecto = p.id_proyecto
        WHERE m.id_usuario = $1 AND m.fecha_baja IS NULL
        ORDER BY p.nombre`,
      [datos.idUsuario, datos.hoy, datos.mes]
    );
    if (proyectos.length === 0) return [];

    // Integrantes activos de esos proyectos, con sus tareas asignadas hechas y pendientes.
    const aportes = await this.persistencia.ejecutar(
      `SELECT m.id_proyecto, u.id_usuario, COALESCE(NULLIF(TRIM(u.apodo), ''), u.nombre) AS nombre,
              COUNT(t.id_tarea) FILTER (WHERE t.completada)::int AS hechas,
              COUNT(t.id_tarea) FILTER (WHERE NOT t.completada)::int AS pendientes
         FROM proyecto_miembros m
         JOIN usuarios u ON u.id_usuario = m.id_usuario
         LEFT JOIN tareas t ON t.id_proyecto = m.id_proyecto AND t.id_asignado = m.id_usuario
        WHERE m.fecha_baja IS NULL AND m.id_proyecto = ANY($1::int[])
        GROUP BY m.id_proyecto, u.id_usuario, nombre
        ORDER BY hechas DESC, nombre`,
      [proyectos.map((p) => p.id_proyecto)]
    );

    return proyectos.map((p) =>
      materializarResumenProyecto(
        p,
        aportes.filter((a) => a.id_proyecto === p.id_proyecto).map(materializarAporte)
      )
    );
  }
}