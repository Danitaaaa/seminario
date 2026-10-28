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
        await exigirAcceso(this.persistencia, actual.idProyecto, actual.creadaPor, dto.idUsuario,
            ['propietario', 'editor']);

        if (actual.idAsignado === dto.idAsignado) return actual;
        if (actual.idProyecto === null) {
            throw new Error('Una tarea personal no se puede asignar a otro integrante');
        }
        const idProyecto = actual.idProyecto;
        if (dto.idAsignado === null && actual.completada) {
            throw new Error('Una tarea hecha no puede quedar sin asignar');
        }

        return this.persistencia.transaccion(async tx => {
            if (dto.idAsignado !== null) await exigirAsignable(tx, idProyecto, dto.idAsignado);

            const orden = await siguienteOrden(tx, idProyecto, dto.idAsignado);
            const filas = await consultar(
                tx,
                `UPDATE tareas SET id_asignado = $2, orden = $3
                 WHERE id_tarea = $1
                 RETURNING ${COLUMNAS_TAREA}`,
                [dto.idTarea, dto.idAsignado, orden],
            );
            if (filas.length === 0) throw new Error('La tarea no existe');
            const tarea = materializarTarea(filas[0]);
            await registrarCambioSiProyecto(tx, tarea.idProyecto, 'tarea', tarea.idTarea, 'modificar',
                { idAsignado: tarea.idAsignado });
            return tarea;
        });
    }
}