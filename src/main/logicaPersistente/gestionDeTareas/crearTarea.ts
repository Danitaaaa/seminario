import { CrearTareaDTOSchema, CrearTareaDTO } from './dto';
import { Tarea } from './entidades';
import { COLUMNAS_TAREA, materializarTarea } from './materializador';
import { columnaDeDto, consultar, resolverAsignado, siguienteOrden } from './buscarTarea';
import { IPersistenciaProyectos } from '../gestionDeProyectos/interfacesSincronizacion';
import { exigirAcceso, registrarCambioSiProyecto } from '../gestionDeProyectos/alcance';

export class CrearTarea {
    constructor(private persistencia: IPersistenciaProyectos) {}

    // Crea una tarea personal (sin idProyecto, queda a nombre del usuario) o de un proyecto.
    async ejecutar(entrada: CrearTareaDTO): Promise<Tarea> {
        const dto = CrearTareaDTOSchema.parse(entrada);
        const idProyecto = dto.idProyecto ?? null;
        const pedido = columnaDeDto(dto.idAsignado, dto.idAsignadoGlobal);
        const idDueno = idProyecto === null ? dto.idUsuario : null;

        await exigirAcceso(this.persistencia, idProyecto, dto.idUsuario, dto.idUsuario, 'tarea.crear');

        return this.persistencia.transaccion(async tx => {
            const col = idProyecto !== null
                ? await resolverAsignado(tx, idProyecto, pedido)
                : pedido; // personal: el DTO ya garantiza que viene sin asignar

            const orden = await siguienteOrden(tx, idProyecto, col, idDueno);
            const filas = await consultar(
                tx,
                `INSERT INTO tareas (id_proyecto, id_usuario, titulo, descripcion, prioridad, fecha_limite,
                                     fecha_inicio, id_asignado, id_asignado_global, orden)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 RETURNING ${COLUMNAS_TAREA}`,
                [
                    idProyecto,
                    idDueno,
                    dto.titulo,
                    dto.descripcion ?? null,
                    dto.prioridad,
                    dto.fechaLimite ?? null,
                    dto.fechaInicio ?? null,
                    col.local,
                    col.global,
                    orden,
                ],
            );
            const tarea = materializarTarea(filas[0]);
            await registrarCambioSiProyecto(tx, tarea.idProyecto, 'tarea', tarea.idTarea, 'crear',
                { titulo: tarea.titulo, idAsignadoGlobal: tarea.idAsignadoGlobal });
            return tarea;
        });
    }
}