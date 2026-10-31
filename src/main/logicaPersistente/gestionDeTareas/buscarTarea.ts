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

export type Columna = { local: number | null; global: string | null };

// 'u:12' -> { local: 12, global: null } | uuid -> { local: null, global: uuid } | null -> sin asignar
export function parsearClave(clave: string | null | undefined): Columna {
    if (!clave) return { local: null, global: null };
    if (clave.startsWith('u:')) {
        const n = Number(clave.slice(2));
        if (!Number.isInteger(n)) throw new Error('Asignado inválido');
        return { local: n, global: null };
    }
    return { local: null, global: clave };
}

// Acepta la clave cruda o una Columna ya parseada.
function comoColumna(valor: Columna | string | null | undefined): Columna {
    return valor !== null && typeof valor === 'object' ? valor : parsearClave(valor);
}

// Solo propietarios y editores con membresía activa pueden tener tareas asignadas.
export async function exigirAsignable(
    tx: Tx, idProyecto: number, asignado: Columna | string | null | undefined,
): Promise<void> {
    const col = comoColumna(asignado);
    if (col.local === null && col.global === null) return; // sin asignar: no hay nada que validar

    const filas = await consultar(
        tx,
        `SELECT 1 FROM proyecto_miembros
         WHERE id_proyecto = $1
           AND fecha_baja IS NULL
           AND rol IN ('propietario', 'editor')
           AND (id_usuario = $2::int OR id_global_usuario = $3::uuid)`,
        [idProyecto, col.local, col.global],
    );
    if (filas.length === 0) {
        throw new Error('Solo se puede asignar a integrantes activos con permiso de edición');
    }
}

export async function siguienteOrden(
    tx: Tx,
    idProyecto: number | null,
    asignado: Columna | string | null | undefined,
): Promise<number> {
    const col = comoColumna(asignado);
    const filas = await consultar(
        tx,
        `SELECT (COALESCE(MAX(orden), 0) + 1)::int AS orden
         FROM tareas
         WHERE id_proyecto IS NOT DISTINCT FROM $1::int
           AND id_asignado        IS NOT DISTINCT FROM $2::int
           AND id_asignado_global IS NOT DISTINCT FROM $3::uuid`,
        [idProyecto, col.local, col.global],
    );
    return Number(filas[0].orden);
}