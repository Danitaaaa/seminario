import { Tarea } from './entidades';

// Fila cruda tal como la devuelve la base (snake_case).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Fila = Record<string, any>;

// `fecha_limite` y `fecha_inicio` se devuelven como texto AAAA-MM-DD para evitar desfases
// de zona horaria al convertir un DATE en un Date de JavaScript.
export const COLUMNAS_TAREA = `id_tarea, id_global, id_proyecto, id_usuario, titulo, descripcion, prioridad,
    to_char(fecha_limite, 'YYYY-MM-DD') AS fecha_limite,
    to_char(fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
    id_asignado, id_asignado_global, completada, fecha_completada, orden, fecha_creacion`;

export function materializarTarea(fila: Fila): Tarea {
    return {
        idTarea: fila.id_tarea,
        idGlobal: fila.id_global,
        idProyecto: fila.id_proyecto ?? null,
        idUsuario: fila.id_usuario ?? null,
        titulo: fila.titulo,
        descripcion: fila.descripcion ?? null,
        prioridad: fila.prioridad,
        fechaLimite: fila.fecha_limite ?? null,
        fechaInicio: fila.fecha_inicio ?? null,
        idAsignado: fila.id_asignado ?? null,
        idAsignadoGlobal: fila.id_asignado_global ?? null,
        completada: fila.completada,
        fechaCompletada: fila.fecha_completada ?? null,
        orden: fila.orden,
        fechaCreacion: fila.fecha_creacion,
    };
}