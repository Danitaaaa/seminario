import { IPersistenciaProyectos } from '../gestionDeProyectos/interfacesSincronizacion';
import { Tarea } from './entidades';
import { COLUMNAS_TAREA, Fila, materializarTarea } from './materializador';

// Tipo de la transacción que recibe `persistencia.transaccion(...)`.
export type Tx = Parameters<Parameters<IPersistenciaProyectos['transaccion']>[0]>[0];

export async function consultar(tx: Tx, sql: string, parametros: unknown[] = []): Promise<Fila[]> {
    return (await tx.ejecutar(sql, parametros)) as Fila[];
}

export async function buscarTareaEnTx(tx: Tx, idTarea: number): Promise<Tarea> {
    const filas = await consultar(
        tx,
        `SELECT ${COLUMNAS_TAREA} FROM tareas WHERE id_tarea = $1`,
        [idTarea],
    );
    if (filas.length === 0) throw new Error('La tarea no existe');
    return materializarTarea(filas[0]);
}

// Se usa para conocer el proyecto (o el creador, si es personal) de la tarea antes de validar permisos.
export function buscarTarea(persistencia: IPersistenciaProyectos, idTarea: number): Promise<Tarea> {
    return persistencia.transaccion(tx => buscarTareaEnTx(tx, idTarea));
}

// Solo propietarios y editores con membresía activa pueden tener tareas asignadas.
export async function exigirAsignable(tx: Tx, idProyecto: number, idUsuario: number): Promise<void> {
    const filas = await consultar(
        tx,
        `SELECT 1 FROM proyecto_miembros
         WHERE id_proyecto = $1 AND id_usuario = $2 AND fecha_baja IS NULL
           AND rol IN ('propietario', 'editor')`,
        [idProyecto, idUsuario],
    );
    if (filas.length === 0) {
        throw new Error('Solo se puede asignar a integrantes activos con permiso de edición');
    }
}

// Posición al final de la columna (idAsignado = null es la columna "sin asignar").
// Para tareas personales (idProyecto = null) el orden es por usuario creador.
export async function siguienteOrden(
    tx: Tx,
    idProyecto: number | null,
    idAsignado: number | null,
    idUsuario?: number,
): Promise<number> {
    if (idProyecto === null) {
        if (idUsuario === undefined) throw new Error('Falta el usuario para ordenar una tarea personal');
        const filas = await consultar(
            tx,
            `SELECT COALESCE(MAX(orden), 0) + 1 AS orden
             FROM tareas WHERE id_proyecto IS NULL AND creada_por = $1`,
            [idUsuario],
        );
        return Number(filas[0].orden);
    }
    const filas = await consultar(
        tx,
        `SELECT COALESCE(MAX(orden), 0) + 1 AS orden
         FROM tareas WHERE id_proyecto = $1 AND id_asignado IS NOT DISTINCT FROM $2::int`,
        [idProyecto, idAsignado],
    );
    return Number(filas[0].orden);
}