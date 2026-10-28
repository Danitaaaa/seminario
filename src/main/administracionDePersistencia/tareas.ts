import { CrearTarea } from '../logicaPersistente/gestionDeTareas/crearTarea';
import { ListarTareas } from '../logicaPersistente/gestionDeTareas/listarTareas';
import { ModificarTarea } from '../logicaPersistente/gestionDeTareas/modificarTarea';
import { AlternarTarea } from '../logicaPersistente/gestionDeTareas/alternarTarea';
import { AsignarTarea } from '../logicaPersistente/gestionDeTareas/asignarTarea';
import { RepartirTareas } from '../logicaPersistente/gestionDeTareas/repartirTareas';
import { EliminarTarea } from '../logicaPersistente/gestionDeTareas/eliminarTarea';
import type {
    CrearTareaDTO, ListarTareasDTO, ModificarTareaDTO, AlternarTareaDTO,
    AsignarTareaDTO, RepartirTareasDTO, EliminarTareaDTO,
} from '../logicaPersistente/gestionDeTareas/dto';

export class Tareas {
    constructor(
        private readonly crearTarea: CrearTarea,
        private readonly listarTareas: ListarTareas,
        private readonly modificarTarea: ModificarTarea,
        private readonly alternarTarea: AlternarTarea,
        private readonly asignarTarea: AsignarTarea,
        private readonly repartirTareas: RepartirTareas,
        private readonly eliminarTarea: EliminarTarea,
    ) {}

    crear(datos: CrearTareaDTO) { return this.crearTarea.ejecutar(datos); }
    listar(datos: ListarTareasDTO) { return this.listarTareas.ejecutar(datos); }
    modificar(datos: ModificarTareaDTO) { return this.modificarTarea.ejecutar(datos); }
    alternar(datos: AlternarTareaDTO) { return this.alternarTarea.ejecutar(datos); }
    asignar(datos: AsignarTareaDTO) { return this.asignarTarea.ejecutar(datos); }
    repartir(datos: RepartirTareasDTO) { return this.repartirTareas.ejecutar(datos); }
    eliminar(datos: EliminarTareaDTO) { return this.eliminarTarea.ejecutar(datos); }
}
