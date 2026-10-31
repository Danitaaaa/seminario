import { CrearTareaDTOSchema, CrearTareaDTO } from './dto';
import { Tarea } from './entidades';
import { COLUMNAS_TAREA, materializarTarea } from './materializador';
import { consultar, exigirAsignable, siguienteOrden } from './buscarTarea';
import { IPersistenciaProyectos } from '../gestionDeProyectos/interfacesSincronizacion';
import { exigirAcceso, registrarCambioSiProyecto } from '../gestionDeProyectos/alcance';

export class CrearTarea {
    constructor(private persistencia: IPersistenciaProyectos) {}

    // Crea una tarea personal (sin idProyecto) o de un proyecto.
    async ejecutar(entrada: CrearTareaDTO): Promise<Tarea> {
        const dto = CrearTareaDTOSchema.parse(entrada);
        const idProyecto = dto.idProyecto ?? null;
        const idAsignadoGlobal = dto.idAsignadoGlobal ?? null;

        if (idProyecto === null && idAsignadoGlobal !== null) {
            throw new Error('Una tarea personal no se puede asignar a otro integrante');
        }
        await exigirAcceso(this.persistencia, idProyecto, dto.idUsuario, dto.idUsuario, 'tarea.crear');

        return this.persistencia.transaccion(async tx => {
            if (idProyecto !== null && idAsignadoGlobal !== null) {
                await exigirAsignable(tx, idProyecto, idAsignadoGlobal);
            }

            const orden = await siguienteOrden(tx, idProyecto, idAsignadoGlobal);
            const filas = await consultar(
                tx,
                `INSERT INTO tareas (id_proyecto, titulo, descripcion, prioridad, fecha_limite, id_asignado_global, orden, creada_por_global, fecha_inicio)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 RETURNING ${COLUMNAS_TAREA}`,
                [
                    idProyecto,
                    dto.titulo,
                    dto.descripcion ?? null,
                    dto.prioridad,
                    dto.fechaLimite ?? null,
                    idAsignadoGlobal,
                    orden,
                    dto.idUsuario,
                    dto.fechaInicio ?? null,
                ],
            );
            const tarea = materializarTarea(filas[0]);
            await registrarCambioSiProyecto(tx, tarea.idProyecto, 'tarea', tarea.idTarea, 'crear',
                { titulo: tarea.titulo, idAsignadoGlobal: tarea.idAsignadoGlobal });
            return tarea;
        });
    }
}
