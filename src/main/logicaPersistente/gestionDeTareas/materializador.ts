import { Tarea } from './entidades';

// Fila cruda tal como la devuelve la base (snake_case).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Fila = Record<string, any>;

// `fecha_limite` se devuelve ya como texto AAAA-MM-DD para evitar desfases de zona horaria
// al convertir un DATE en un Date de JavaScript.
export const COLUMNAS_TAREA = `id_tarea, id_global, id_proyecto, titulo, descripcion, prioridad,
    to_char(fecha_limite, 'YYYY-MM-DD') AS fecha_limite,
    id_asignado, completada, fecha_completada, completada_por, orden, creada_por, fecha_creacion`;

export function materializarTarea(fila: Fila): Tarea {
    return {
        idTarea: fila.id_tarea,
        idGlobal: fila.id_global,
        idProyecto: fila.id_proyecto,
        titulo: fila.titulo,
        descripcion: fila.descripcion ?? null,
        prioridad: fila.prioridad,
        fechaLimite: fila.fecha_limite ?? null,
        idAsignado: fila.id_asignado ?? null,
        completada: fila.completada,
        fechaCompletada: fila.fecha_completada ?? null,
        completadaPor: fila.completada_por ?? null,
        orden: fila.orden,
        creadaPor: fila.creada_por,
        fechaCreacion: fila.fecha_creacion,
    };
}
