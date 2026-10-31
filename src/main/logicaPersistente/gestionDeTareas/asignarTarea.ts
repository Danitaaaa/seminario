import { AsignarTareaDTOSchema, AsignarTareaDTO } from './dto';
import { Tarea } from './entidades';
import { COLUMNAS_TAREA, materializarTarea } from './materializador';
import {
    buscarTarea, columnaDeDto, consultar, estaSinAsignar, resolverAsignado, siguienteOrden,
} from './buscarTarea';
import { IPersistenciaProyectos } from '../gestionDeProyectos/interfacesSincronizacion';
import { exigirAcceso, registrarCambioSiProyecto } from '../gestionDeProyectos/alcance';

export class AsignarTarea {
    constructor(private persistencia: IPersistenciaProyectos) {}

    // Mueve la tarea al final de la columna del integrante (o a "sin asignar").
    // Solo aplica a tareas de proyecto.
    async ejecutar(entrada: AsignarTareaDTO): Promise<Tarea> {
        const dto = AsignarTareaDTOSchema.parse(entrada);
        const actual = await buscarTarea(this.persistencia, dto.idTarea);
        await exigirAcceso(this.persistencia, actual.idProyecto, actual.idUsuario, dto.idUsuario,
            'tarea.asignar');

        if (actual.idProyecto === null) {
            throw new Error('Una tarea personal no se puede asignar a otro integrante');
        }
        const idProyecto = actual.idProyecto;
        const pedido = columnaDeDto(dto.idAsignado, dto.idAsignadoGlobal);
        if (estaSinAsignar(pedido) && actual.completada) {
            throw new Error('Una tarea hecha no puede quedar sin asignar');
        }

        return this.persistencia.transaccion(async tx => {
            const col = await resolverAsignado(tx, idProyecto, pedido);
            if (col.local === actual.idAsignado && col.global === actual.idAsignadoGlobal) return actual;

            const orden = await siguienteOrden(tx, idProyecto, col);
            const filas = await consultar(
                tx,
                `UPDATE tareas SET id_asignado = $2, id_asignado_global = $3, orden = $4
                 WHERE id_tarea = $1
                 RETURNING ${COLUMNAS_TAREA}`,
                [dto.idTarea, col.local, col.global, orden],
            );
            if (filas.length === 0) throw new Error('La tarea no existe');
            const tarea = materializarTarea(filas[0]);
            await registrarCambioSiProyecto(tx, tarea.idProyecto, 'tarea', tarea.idTarea, 'modificar',
                { idAsignadoGlobal: tarea.idAsignadoGlobal });
            return tarea;
        });
    }
}