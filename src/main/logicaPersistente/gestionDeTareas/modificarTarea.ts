import { ModificarTareaDTOSchema, ModificarTareaDTO } from './dto';
import { Tarea } from './entidades';
import { COLUMNAS_TAREA, materializarTarea } from './materializador';
import { buscarTarea, consultar } from './buscarTarea';
import { IPersistenciaProyectos } from '../gestionDeProyectos/interfacesSincronizacion';
import { exigirAcceso, registrarCambioSiProyecto } from '../gestionDeProyectos/alcance';

export class ModificarTarea {
    constructor(private persistencia: IPersistenciaProyectos) {}

    // Edita título, descripción, prioridad y fecha límite. Para cambiar de columna se usa AsignarTarea.
    async ejecutar(entrada: ModificarTareaDTO): Promise<Tarea> {
        const dto = ModificarTareaDTOSchema.parse(entrada);
        const actual = await buscarTarea(this.persistencia, dto.idTarea);
        await exigirAcceso(this.persistencia, actual.idProyecto, actual.creadaPor, dto.idUsuario,
            ['propietario', 'editor']);

        const columnas: string[] = [];
        const valores: unknown[] = [];
        const cambios: Record<string, unknown> = {};
        const agregar = (columna: string, campo: string, valor: unknown) => {
            valores.push(valor);
            columnas.push(`${columna} = $${valores.length}`);
            cambios[campo] = valor;
        };

        if (dto.titulo !== undefined) agregar('titulo', 'titulo', dto.titulo);
        if (dto.descripcion !== undefined) agregar('descripcion', 'descripcion', dto.descripcion);
        if (dto.prioridad !== undefined) agregar('prioridad', 'prioridad', dto.prioridad);
        if (dto.fechaLimite !== undefined) agregar('fecha_limite', 'fechaLimite', dto.fechaLimite);

        if (columnas.length === 0) return actual;

        return this.persistencia.transaccion(async tx => {
            valores.push(dto.idTarea);
            const filas = await consultar(
                tx,
                `UPDATE tareas SET ${columnas.join(', ')}
                 WHERE id_tarea = $${valores.length}
                 RETURNING ${COLUMNAS_TAREA}`,
                valores,
            );
            if (filas.length === 0) throw new Error('La tarea no existe');
            const tarea = materializarTarea(filas[0]);
            await registrarCambioSiProyecto(tx, tarea.idProyecto, 'tarea', tarea.idTarea, 'modificar', cambios);
            return tarea;
        });
    }
}