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

// Se usa para conocer el proyecto (o el dueño, si es personal) de la tarea antes de validar permisos.
export function buscarTarea(persistencia: IPersistenciaProyectos, idTarea: number): Promise<Tarea> {
    return persistencia.transaccion(tx => buscarTareaEnTx(tx, idTarea));
}

// Un asignado: o un usuario local (proyecto personal) o un uid global (proyecto compartido).
export type Columna = { local: number | null; global: string | null };

export const SIN_ASIGNAR: Columna = { local: null, global: null };

export function columnaDeDto(
    idAsignado: number | null | undefined,
    idAsignadoGlobal: string | null | undefined,
): Columna {
    return { local: idAsignado ?? null, global: idAsignadoGlobal ?? null };
}

export function estaSinAsignar(col: Columna): boolean {
    return col.local === null && col.global === null;
}

// Valida que el asignado sea un integrante activo con permiso de edición y devuelve la columna
// normalizada: si el integrante tiene uid global se usa ese (proyecto compartido); si no, el id local.
export async function resolverAsignado(tx: Tx, idProyecto: number, col: Columna): Promise<Columna> {
    if (estaSinAsignar(col)) return SIN_ASIGNAR;

    const filas = await consultar(
        tx,
        `SELECT id_usuario, id_global_usuario FROM proyecto_miembros
         WHERE id_proyecto = $1
           AND fecha_baja IS NULL
           AND rol IN ('propietario', 'editor')
           AND (id_usuario = $2::int OR id_global_usuario = $3::uuid)
         ORDER BY fecha_union DESC
         LIMIT 1`,
        [idProyecto, col.local, col.global],
    );
    if (filas.length === 0) {
        throw new Error('Solo se puede asignar a integrantes activos con permiso de edición');
    }
    const m = filas[0];
    return m.id_global_usuario
        ? { local: null, global: m.id_global_usuario }
        : { local: m.id_usuario, global: null };
}

// Siguiente posición dentro de una columna del tablero.
// `idDueno` separa las tareas personales de cada usuario (en las de proyecto es null).
export async function siguienteOrden(
    tx: Tx,
    idProyecto: number | null,
    col: Columna,
    idDueno: number | null = null,
): Promise<number> {
    const filas = await consultar(
        tx,
        `SELECT (COALESCE(MAX(orden), 0) + 1)::int AS orden
         FROM tareas
         WHERE id_proyecto         IS NOT DISTINCT FROM $1::int
           AND id_usuario          IS NOT DISTINCT FROM $4::int
           AND id_asignado         IS NOT DISTINCT FROM $2::int
           AND id_asignado_global  IS NOT DISTINCT FROM $3::uuid`,
        [idProyecto, col.local, col.global, idDueno],
    );
    return Number(filas[0].orden);
}