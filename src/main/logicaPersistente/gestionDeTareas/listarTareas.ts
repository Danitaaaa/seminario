import { ListarTareasDTOSchema, ListarTareasDTO } from './dto';
import { Tarea } from './entidades';
import { COLUMNAS_TAREA, materializarTarea } from './materializador';
import { consultar } from './buscarTarea';
import { IPersistenciaProyectos } from '../gestionDeProyectos/interfacesSincronizacion';
import { exigirAcceso, filtroAlcance } from '../gestionDeProyectos/alcance';

export class ListarTareas {
    constructor(private persistencia: IPersistenciaProyectos) {}

    // Con idProyecto: todas las tareas del proyecto. Sin idProyecto: las tareas personales del usuario.
    // El agrupado por columna lo hace el tablero.
    async ejecutar(entrada: ListarTareasDTO): Promise<Tarea[]> {
        const dto = ListarTareasDTOSchema.parse(entrada);
        const idProyecto = dto.idProyecto ?? null;
        await exigirAcceso(this.persistencia, idProyecto, dto.idUsuario, dto.idUsuario,
            ['propietario', 'editor', 'lector']);

        return this.persistencia.transaccion(async tx => {
            const valores: unknown[] = [];
            const alcance = filtroAlcance(valores, idProyecto, dto.idUsuario);
            const filas = await consultar(
                tx,
                `SELECT ${COLUMNAS_TAREA} FROM tareas
                 WHERE ${alcance}
                 ORDER BY orden, id_tarea`,
                valores,
            );
            return filas.map(fila => materializarTarea(fila));
        });
    }
}