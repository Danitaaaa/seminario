import { AsignarTareaDTOSchema, AsignarTareaDTO } from './dto';
import { Tarea } from './entidades';
import { COLUMNAS_TAREA, materializarTarea } from './materializador';
import { buscarTarea, consultar, exigirAsignable, siguienteOrden } from './buscarTarea';
import { IPersistenciaProyectos } from '../gestionDeProyectos/interfacesSincronizacion';
import { exigirAcceso, registrarCambioSiProyecto } from '../gestionDeProyectos/alcance';

export class AsignarTarea {
    constructor(private persistencia: IPersistenciaProyectos) {}

    // Mueve la tarea al final de la columna del integrante (o a "sin asignar" con null).
    // Solo aplica a tareas de proyecto.
    async ejecutar(entrada: AsignarTareaDTO): Promise<Tarea> {
        const dto = AsignarTareaDTOSchema.parse(entrada);
        const actual = await buscarTarea(this.persistencia, dto.idTarea);
        await exigirAcceso(this.persistencia, actual.idProyecto, actual.creadaPorGlobal, dto.idAsignadoGlobal!,
            'tarea.asignar');

        if (actual.idAsignadoGlobal === dto.idAsignadoGlobal) return actual;
        if (actual.idProyecto === null) {
            throw new Error('Una tarea personal no se puede asignar a otro integrante');
        }
        const idProyecto = actual.idProyecto;
        if (dto.idAsignadoGlobal === null && actual.completada) {
            throw new Error('Una tarea hecha no puede quedar sin asignar');
        }

        return this.persistencia.transaccion(async tx => {
            if (dto.idAsignadoGlobal !== null) await exigirAsignable(tx, idProyecto, dto.idAsignadoGlobal);

            const orden = await siguienteOrden(tx, idProyecto, dto.idAsignadoGlobal);
            const filas = await consultar(
                tx,
                `UPDATE tareas SET id_asignado_global = $2, orden = $3
                 WHERE id_tarea = $1
                 RETURNING ${COLUMNAS_TAREA}`,
                [dto.idTarea, dto.idAsignadoGlobal, orden],
            );
            if (filas.length === 0) throw new Error('La tarea no existe');
            const tarea = materializarTarea(filas[0]);
            await registrarCambioSiProyecto(tx, tarea.idProyecto, 'tarea', tarea.idTarea, 'modificar',
                { idAsignadoGlobal: tarea.idAsignadoGlobal });
            return tarea;
        });
    }
}