import { Tarea } from './entidades';

// Fila cruda tal como la devuelve la base (snake_case).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Fila = Record<string, any>;

// `fecha_limite` se devuelve ya como texto AAAA-MM-DD para evitar desfases de zona horaria
// al convertir un DATE en un Date de JavaScript.
export const COLUMNAS_TAREA = `id_tarea, id_global, id_proyecto, titulo, descripcion, prioridad,
    to_char(fecha_limite, 'YYYY-MM-DD') AS fecha_limite,
    to_char(fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
    id_asignado_global, completada, fecha_completada, completada_por_global, orden, creada_por, fecha_creacion`;

export function materializarTarea(fila: Fila): Tarea {
    return {
        idTarea: fila.id_tarea,
        idGlobal: fila.id_global,
        idProyecto: fila.id_proyecto,
        titulo: fila.titulo,
        descripcion: fila.descripcion ?? null,
        prioridad: fila.prioridad,
        fechaLimite: fila.fecha_limite ?? null,
        fechaInicio: fila.fecha_inicio ?? null,
        idAsignadoGlobal: fila.id_asignado_global ?? null,
        completada: fila.completada,
        fechaCompletada: fila.fecha_completada ?? null,
        completadaPorGlobal: fila.completada_por_global ?? null,
        orden: fila.orden,
        creadaPorGlobal: fila.creada_por,
        fechaCreacion: fila.fecha_creacion,
    };
}
