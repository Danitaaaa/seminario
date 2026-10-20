import { IPersistenciaProyectos } from './interfacesSincronizacion';
import { RolMiembro } from './entidades';

// Devuelve el rol activo del usuario en el proyecto, o null si no es miembro. 
export async function obtenerRolActivo(
    p: IPersistenciaProyectos, idProyecto: number, idUsuario: number,
): Promise<RolMiembro | null> {
    const filas = await p.ejecutar(
        `SELECT rol FROM proyecto_miembros
         WHERE id_proyecto = $1 AND id_usuario = $2 AND fecha_baja IS NULL`,
        [idProyecto, idUsuario],
    );
    return filas[0]?.rol ?? null;
}

export async function exigirRol(
    p: IPersistenciaProyectos, idProyecto: number, idUsuario: number, permitidos: RolMiembro[],
): Promise<RolMiembro> {
    const rol = await obtenerRolActivo(p, idProyecto, idUsuario);
    if (!rol) throw new Error('El usuario no es miembro del proyecto');
    if (!permitidos.includes(rol)) throw new Error('No tenés permisos para esta operación');
    return rol;
}

// Registra un cambio local en la cola de sincronización y sube la versión del proyecto. 
export async function registrarCambio(
    p: IPersistenciaProyectos, idProyecto: number,
    entidad: 'proyecto' | 'miembro' | 'nodo' | 'archivo', idEntidad: number,
    operacion: 'crear' | 'modificar' | 'eliminar' | 'mover', payload?: unknown,
): Promise<void> {
    await p.ejecutar(
        `INSERT INTO cola_sincronizacion (id_proyecto, entidad, id_entidad, operacion, payload)
         VALUES ($1, $2, $3, $4, $5)`,
        [idProyecto, entidad, idEntidad, operacion, payload ? JSON.stringify(payload) : null],
    );
    await p.ejecutar(`UPDATE proyectos SET version = version + 1 WHERE id_proyecto = $1`, [idProyecto]);
}