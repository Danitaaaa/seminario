import { IPersistenciaProyectos } from './interfacesSincronizacion';
import { RolMiembro } from './entidades';
import { EntidadSincronizable } from './entidades';
import { OperacionSincronizable } from './entidades';
import { REGLAS, Accion } from './reglasPermisos';

// Devuelve el rol activo del usuario en el proyecto, o null si no es miembro.
export async function obtenerRolActivo(
    p: IPersistenciaProyectos, idProyecto: number, idUsuario: string | number,
): Promise<RolMiembro | null> {
    const filas = await p.ejecutar(
        `SELECT rol FROM proyecto_miembros
         WHERE id_proyecto = $1 AND id_usuario = $2 AND fecha_baja IS NULL`,
        [idProyecto, idUsuario],
    );
    return filas[0]?.rol ?? null;
}

// Interno (sin export): los roles ya no se pasan desde los casos de uso.
async function exigirRolInterno(
    p: IPersistenciaProyectos, idProyecto: number, idUsuario: string | number, permitidos: readonly RolMiembro[],
): Promise<RolMiembro> {
    const rol = await obtenerRolActivo(p, idProyecto, idUsuario);
    if (!rol) throw new Error('El usuario no es miembro del proyecto');
    if (!permitidos.includes(rol)) throw new Error('No tenés permisos para esta operación');
    return rol;
}

// Punto de entrada: el caso de uso declara la acción, la tabla decide los roles.
export async function exigirPermiso(
    p: IPersistenciaProyectos, idProyecto: number, idUsuario: string | number, accion: Accion,
): Promise<RolMiembro> {
    const permitidos = REGLAS[accion];
    if (!permitidos) throw new Error(`Acción de permiso desconocida: ${String(accion)}`);
    return exigirRolInterno(p, idProyecto, idUsuario, permitidos);
}

// Registra un cambio local en la cola de sincronización y sube la versión del proyecto.
export async function registrarCambio(
    p: IPersistenciaProyectos, idProyecto: number,
    entidad: EntidadSincronizable, idEntidad: number,
    operacion: OperacionSincronizable, payload?: unknown,
): Promise<void> {
    await p.ejecutar(
        `INSERT INTO cola_sincronizacion (id_proyecto, entidad, id_entidad, operacion, payload)
         VALUES ($1, $2, $3, $4, $5)`,
        [idProyecto, entidad, idEntidad, operacion, payload ? JSON.stringify(payload) : null],
    );
    await p.ejecutar(`UPDATE proyectos SET version = version + 1 WHERE id_proyecto = $1`, [idProyecto]);
}