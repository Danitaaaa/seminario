import { unlink } from 'node:fs/promises';
import { EliminarProyectoDTOSchema, EliminarProyectoDTO } from './dto';
import { IPersistenciaProyectos, ISincronizador } from './interfacesSincronizacion';
import { exigirPermiso } from './permisos';
import { asegurarConexion } from './miembrosRemotos';

export class EliminarProyecto {
    constructor(
        private persistencia: IPersistenciaProyectos,
        private sincronizador: ISincronizador,
        // Para que el coordinador deje de vigilar el proyecto (sync.coordinador.dejarDeVigilar).
        private dejarDeVigilar?: (idProyecto: number) => void | Promise<void>,
    ) {}

    async ejecutar(entrada: EliminarProyectoDTO): Promise<void> {
        const dto = EliminarProyectoDTOSchema.parse(entrada);
        await exigirPermiso(this.persistencia, dto.idProyecto, dto.idUsuario, 'proyecto.eliminar');

        const proy = await this.persistencia.ejecutar<{ id_remoto: string | null }>(
            `SELECT id_remoto FROM proyectos WHERE id_proyecto = $1`, [dto.idProyecto]);
        if (!proy[0]) throw new Error('Proyecto inexistente');
        const idRemoto = proy[0].id_remoto;

        // 1) Dejar de vigilar antes de borrar: la cascada del servidor emite avisos que dispararían sincronizaciones.
        //    Si algo falla más adelante, el próximo barrido vuelve a vigilarlo.
        try { await this.dejarDeVigilar?.(dto.idProyecto); }
        catch (e) { console.warn('No se pudo dejar de vigilar el proyecto.', e); }

        // 2) Servidor primero. Si no se puede (sin conexión, sin permiso) no se toca nada local:
        //    borrar solo lo local dejaría el proyecto huérfano en el servidor, visible para los demás miembros.
        if (idRemoto) {
            try {
                await asegurarConexion(this.sincronizador);
                await this.sincronizador.enviarCambios(idRemoto, [{
                    id: 0, idProyecto: dto.idProyecto, entidad: 'proyecto', idEntidad: dto.idProyecto,
                    operacion: 'eliminar', payload: null, fechaCambio: new Date(), fechaEnvio: null,
                }]);
            } catch (e) {
                throw new Error(
                    'No se pudo eliminar el proyecto del servidor, así que no se eliminó. ' +
                    'Revisá tu conexión e intentá de nuevo. ' +
                    `(${e instanceof Error ? e.message : String(e)})`);
            }
        }

        // 3) Borrado local.
        const rutas = await this.persistencia.transaccion(async tx => {
            const filas = await tx.ejecutar(
                `SELECT id_nodo_raiz FROM proyectos WHERE id_proyecto = $1`, [dto.idProyecto]);
            if (!filas[0]) throw new Error('Proyecto inexistente');
            const idNodoRaiz: number = filas[0].id_nodo_raiz;

            // proyectos -> nodos es RESTRICT: primero el proyecto, luego su carpeta.
            await tx.ejecutar(`DELETE FROM proyectos WHERE id_proyecto = $1`, [dto.idProyecto]);

            const subarbol = `WITH RECURSIVE subarbol AS (
                SELECT id_nodo FROM nodos WHERE id_nodo = $1
                UNION ALL
                SELECT n.id_nodo FROM nodos n JOIN subarbol s ON n.id_padre = s.id_nodo
            )`;

            const archivos = await tx.ejecutar(
                `${subarbol}
                 DELETE FROM archivos WHERE id_padre IN (SELECT id_nodo FROM subarbol)
                 RETURNING ruta_fisica`, [idNodoRaiz]);

            await tx.ejecutar(
                `${subarbol}
                 DELETE FROM nodos WHERE id_nodo IN (SELECT id_nodo FROM subarbol)`, [idNodoRaiz]);

            return archivos.map(a => a.ruta_fisica as string);
        });

        // Los archivos físicos se borran recién después del commit: si la transacción falla, no se pierde nada.
        await Promise.allSettled(rutas.map(r => unlink(r)));
    }
}