import { IPersistenciaProyectos } from './interfacesSincronizacion';
import { exigirRol, registrarCambio } from './permisos';

type Rol = Parameters<typeof exigirRol>[3][number];
type Tx = Parameters<typeof registrarCambio>[0];
type Entidad = Parameters<typeof registrarCambio>[2];
type IdEntidad = Parameters<typeof registrarCambio>[3];
type Accion = Parameters<typeof registrarCambio>[4];
type Datos = Parameters<typeof registrarCambio>[5];

// Con proyecto: exige uno de los roles indicados.
// Sin proyecto (elemento personal): solo puede operar quien lo creó.
export async function exigirAcceso(
    persistencia: IPersistenciaProyectos,
    idProyecto: number | null | undefined,
    idCreador: number,
    idUsuario: number,
    roles: Rol[],
): Promise<void> {
    if (idProyecto == null) {
        if (idCreador !== idUsuario) throw new Error('No tenés permiso sobre este elemento personal');
        return;
    }
    await exigirRol(persistencia, idProyecto, idUsuario, roles);
}

// Tabla y PK de las entidades con id_global que se registran por este camino.
// (nodos y archivos usan registrarCambioContenido, en alcanceContenido.ts)
const TABLA_ENTIDAD: Partial<Record<string, { tabla: string; pk: string }>> = {
    evento: { tabla: 'eventos', pk: 'id' },
    meta:   { tabla: 'metas',   pk: 'id_meta' },
    tarea:  { tabla: 'tareas',  pk: 'id_tarea' },
};

// Solo registra el cambio para sincronizar si el elemento pertenece a un proyecto.
// Agrega `idGlobal` al payload: sin él, SincronizarProyecto no marca el elemento como pendiente.
// En 'eliminar' la fila ya no existe: el caso de uso debe mandar idGlobal en `datos` (RETURNING id_global).
export async function registrarCambioSiProyecto(
    tx: Tx,
    idProyecto: number | null | undefined,
    entidad: Entidad,
    idEntidad: IdEntidad,
    accion: Accion,
    datos: Datos,
): Promise<void> {
    if (idProyecto == null) return;

    let payload = datos;
    const t = TABLA_ENTIDAD[entidad as string];
    if (t && accion !== 'eliminar') {
        // t.tabla y t.pk salen de la constante de arriba, no de datos del usuario.
        const f = await tx.ejecutar(`SELECT id_global FROM ${t.tabla} WHERE ${t.pk} = $1`, [idEntidad]);
        if (f[0]) payload = { ...(datos as object | undefined), idGlobal: f[0].id_global };
    }
    await registrarCambio(tx, idProyecto, entidad, idEntidad, accion, payload);
}

// Condición SQL de alcance: con proyecto filtra por proyecto; sin proyecto, por elementos personales del usuario.
// Agrega los parámetros necesarios a `valores` y devuelve el fragmento.
export function filtroAlcance(
    valores: unknown[],
    idProyecto: number | null | undefined,
    idUsuario: number,
): string {
    if (idProyecto == null) {
        valores.push(idUsuario);
        return `id_proyecto IS NULL AND creada_por = $${valores.length}`;
    }
    valores.push(idProyecto);
    return `id_proyecto = $${valores.length}`;
}
