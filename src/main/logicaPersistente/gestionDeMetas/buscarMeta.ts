import { IPersistenciaProyectos } from '../gestionDeProyectos/interfacesSincronizacion';
import { COLUMNAS_META } from './materializador';

// Busca una meta por id (sin validar permisos). Lanza error si no existe.
export async function obtenerFilaMeta(persistencia: IPersistenciaProyectos, idMeta: number) {
    const filas = await persistencia.ejecutar(
        `SELECT ${COLUMNAS_META} FROM metas WHERE id_meta = $1`, [idMeta]);
    if (!filas[0]) throw new Error('Meta inexistente');
    return filas[0];
}
