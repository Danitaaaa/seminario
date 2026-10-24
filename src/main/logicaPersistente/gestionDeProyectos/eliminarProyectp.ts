import { EliminarProyectoDTOSchema, EliminarProyectoDTO } from './dto';
import { IPersistenciaProyectos } from './interfacesSincronizacion';
import { exigirRol } from './permisos';

interface IEliminarNodo { ejecutar(dto: { id: number }): Promise<unknown>; }

export class EliminarProyecto {
    constructor(private persistencia: IPersistenciaProyectos, private eliminarNodo: IEliminarNodo) {}

    async ejecutar(entrada: EliminarProyectoDTO): Promise<void> {
        const dto = EliminarProyectoDTOSchema.parse(entrada);
        await exigirRol(this.persistencia, dto.idProyecto, dto.idUsuario, ['propietario']);

        const filas = await this.persistencia.ejecutar(
            `SELECT id_nodo_raiz FROM proyectos WHERE id_proyecto = $1`, [dto.idProyecto]);
        if (!filas[0]) throw new Error('Proyecto inexistente');
        const idNodoRaiz: number = filas[0].id_nodo_raiz;

        // proyectos -> nodos es RESTRICT: primero el proyecto (cascada a miembros y cola), luego su carpeta.
        await this.persistencia.ejecutar(`DELETE FROM proyectos WHERE id_proyecto = $1`, [dto.idProyecto]);

        // Elimina la carpeta raíz y su contenido (según el comportamiento de EliminarNodo existente).
        await this.eliminarNodo.ejecutar({ id: idNodoRaiz });
    }
}