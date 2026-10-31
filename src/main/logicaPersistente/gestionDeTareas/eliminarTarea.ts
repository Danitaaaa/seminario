import { EliminarTareaDTOSchema, EliminarTareaDTO } from './dto';
import { buscarTarea, consultar } from './buscarTarea';
import { IPersistenciaProyectos } from '../gestionDeProyectos/interfacesSincronizacion';
import { exigirAcceso, registrarCambioSiProyecto } from '../gestionDeProyectos/alcance';

export class EliminarTarea {
    constructor(private persistencia: IPersistenciaProyectos) {}

    async ejecutar(entrada: EliminarTareaDTO): Promise<void> {
        const dto = EliminarTareaDTOSchema.parse(entrada);
        const actual = await buscarTarea(this.persistencia, dto.idTarea);
        await exigirAcceso(this.persistencia, actual.idProyecto, actual.idUsuario, dto.idUsuario,
            'tarea.eliminar');

        await this.persistencia.transaccion(async tx => {
            const r = await consultar(tx, `DELETE FROM tareas WHERE id_tarea = $1 RETURNING id_global`, [dto.idTarea]);
            await registrarCambioSiProyecto(tx, actual.idProyecto, 'tarea', actual.idTarea, 'eliminar',
                { titulo: actual.titulo, idGlobal: r[0]?.id_global });
        });
    }
}