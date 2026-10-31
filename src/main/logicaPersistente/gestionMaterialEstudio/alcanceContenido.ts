import { IPersistenciaProyectos } from '../gestionDeProyectos/interfacesSincronizacion';
import { exigirPermiso } from '../gestionDeProyectos/permisos';
import type { Accion } from '../gestionDeProyectos/reglasPermisos';
import { usuarioSesionSync } from '../../sesionSync'; 

function usuarioActual(): number {
    const id = usuarioSesionSync();
    if (id == null) throw new Error('No hay una sesión iniciada');
    return id;
}

// Sube por el árbol hasta la raíz de un proyecto. null = no cuelga de ningún proyecto.
export async function proyectoDeNodo(p: IPersistenciaProyectos, idNodo: number): Promise<number | null> {
    const filas = await p.ejecutar<{ id_proyecto: number }>(
        `WITH RECURSIVE ancestros AS (
            SELECT id_nodo, id_padre FROM nodos WHERE id_nodo = $1
            UNION ALL
            SELECT n.id_nodo, n.id_padre FROM nodos n JOIN ancestros a ON n.id_nodo = a.id_padre
        )
        SELECT p.id_proyecto FROM proyectos p
        JOIN ancestros a ON a.id_nodo = p.id_nodo_raiz
        LIMIT 1`,
        [idNodo],
    );
    return filas[0]?.id_proyecto ?? null;
}

// Exige permiso sobre la carpeta. Si no cuelga de un proyecto (contenido personal), no hay chequeo.
// Devuelve el id del proyecto (o null) para poder comparar origen y destino.
export async function exigirPermisoNodo(
    p: IPersistenciaProyectos, idNodo: number | null | undefined, accion: Accion,
): Promise<number | null> {;
    if (idNodo == null) return null;
    const idProyecto = await proyectoDeNodo(p, idNodo);
    if (idProyecto != null) await exigirPermiso(p, idProyecto, usuarioActual(), accion);
    return idProyecto;
}

export async function exigirPermisoArchivo(
    p: IPersistenciaProyectos, idArchivo: number, accion: Accion,
): Promise<number | null> {
    const f = await p.ejecutar<{ id_padre: number }>(
        `SELECT id_padre FROM archivos WHERE id_archivo = $1`, [idArchivo]);
    if (!f[0]) throw new Error(`No existe un archivo con id ${idArchivo}.`);
    return exigirPermisoNodo(p, f[0].id_padre, accion);
}

// Varios archivos: todos deben ser del mismo proyecto (o todos personales).
export async function exigirPermisoArchivos(
    p: IPersistenciaProyectos, ids: number[], accion: Accion,
): Promise<number | null> {
    const proyectos = new Set<number | null>();
    for (const id of ids) proyectos.add(await exigirPermisoArchivo(p, id, accion));
    if (proyectos.size > 1) throw new Error('Los archivos pertenecen a proyectos distintos');
    return [...proyectos][0] ?? null;
}