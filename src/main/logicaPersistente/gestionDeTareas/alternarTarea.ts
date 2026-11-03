import { AlternarTareaDTOSchema, AlternarTareaDTO } from './dto';
import { Tarea } from './entidades';
import { COLUMNAS_TAREA, materializarTarea } from './materializador';
import { buscarTarea, consultar } from './buscarTarea';
import { IPersistenciaProyectos } from '../gestionDeProyectos/interfacesSincronizacion';
import { exigirAcceso, registrarCambioSiProyecto } from '../gestionDeProyectos/alcance';

export class AlternarTarea {
    constructor(private persistencia: IPersistenciaProyectos) {}

    async ejecutar(entrada: AlternarTareaDTO): Promise<Tarea> {
        const dto = AlternarTareaDTOSchema.parse(entrada);
        const actual = await buscarTarea(this.persistencia, dto.idTarea);
        await exigirAcceso(this.persistencia, actual.idProyecto, actual.idUsuario, dto.idUsuario,
            'tarea.alternar');

        const completada = dto.completada ?? !actual.completada;
        if (completada === actual.completada) return actual;
        // En un proyecto, la tarea debe estar asignada para marcarla como hecha (las personales no se asignan)
        if (completada && actual.idProyecto !== null
            && actual.idAsignado === null && actual.idAsignadoGlobal === null) {
            throw new Error('Asigná la tarea a un integrante antes de marcarla como hecha');
        }

        return this.persistencia.transaccion(async tx => {
            const filas = await consultar(
                tx,
                `UPDATE tareas
                 SET completada = $2::boolean,
                     fecha_completada = CASE WHEN $2::boolean THEN NOW() ELSE NULL END
                 WHERE id_tarea = $1
                 RETURNING ${COLUMNAS_TAREA}`,
                [dto.idTarea, completada],
            );
            if (filas.length === 0) throw new Error('La tarea no existe');
            const tarea = materializarTarea(filas[0]);
            await registrarCambioSiProyecto(tx, tarea.idProyecto, 'tarea', tarea.idTarea, 'modificar',
                { completada: tarea.completada });
            return tarea;
        });
    }
}