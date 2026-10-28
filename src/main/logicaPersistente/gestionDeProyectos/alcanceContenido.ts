import { IPersistenciaProyectos } from './interfacesSincronizacion';
import { registrarCambio } from './permisos';

type Op = Parameters<typeof registrarCambio>[4];

// Proyecto al que pertenece un nodo (él mismo o un ancestro es la raíz de un proyecto), o null si es personal.
async function proyectoDe(tx: IPersistenciaProyectos, idNodo: number) {
    const f = await tx.ejecutar(
        `WITH RECURSIVE ancestros AS (
            SELECT id_nodo, id_padre FROM nodos WHERE id_nodo = $1
            UNION ALL
            SELECT n.id_nodo, n.id_padre FROM nodos n JOIN ancestros a ON n.id_nodo = a.id_padre
         )
         SELECT p.id_proyecto, p.id_nodo_raiz FROM proyectos p
         JOIN ancestros a ON a.id_nodo = p.id_nodo_raiz LIMIT 1`, [idNodo]);
    return f[0] ? { idProyecto: f[0].id_proyecto as number, idNodoRaiz: f[0].id_nodo_raiz as number } : null;
}

/**
 * Registra un cambio de nodo/archivo. `idPadre` es el padre del elemento (para 'eliminar', el que tenía).
 * El padre viaja por id_global; si es la raíz del proyecto viaja `padre_es_raiz` (cada PC tiene la suya).
 * Si el elemento no cuelga de un proyecto, no encola nada.
 */
export async function registrarCambioContenido(
    tx: IPersistenciaProyectos, entidad: 'nodo' | 'archivo', idEntidad: number,
    operacion: Op, idGlobal: string, idPadre: number, datos: Record<string, unknown> = {},
): Promise<void> {
    const raiz = await proyectoDe(tx, idPadre);
    if (!raiz) return;
    const [pa] = await tx.ejecutar(`SELECT id_global FROM nodos WHERE id_nodo = $1`, [idPadre]);
    await registrarCambio(tx, raiz.idProyecto, entidad, idEntidad, operacion, {
        idGlobal,
        datos: { ...datos, padre_global: pa?.id_global ?? null, padre_es_raiz: idPadre === raiz.idNodoRaiz },
    });
}
