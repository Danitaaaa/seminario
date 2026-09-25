import { Nodo } from '../logicaPersistente/gestionMaterialEstudio/entidades';
import { 
    CrearNodoDTO,
    ModificarNodoDTO,
    BuscarNodosDTO,
    EliminarNodoDTO,
    MoverNodoDTO,
} from '../logicaPersistente/gestionMaterialEstudio/dto';

import { CrearNodo } from '../logicaPersistente/gestionMaterialEstudio/crearNodo';
import { ModificarNodo } from '../logicaPersistente/gestionMaterialEstudio/modificarNodo';
import { BuscarNodos } from '../logicaPersistente/gestionMaterialEstudio/buscarNodos';
import { EliminarNodo } from '../logicaPersistente/gestionMaterialEstudio/elminarNodo';
import { MoverNodo } from '../logicaPersistente/gestionMaterialEstudio/moverNodo';

export class Nodos {
    constructor(
        private readonly crearNodo: CrearNodo,
        private readonly modificarNodo: ModificarNodo,
        private readonly buscarNodos: BuscarNodos,
        private readonly eliminarNodo: EliminarNodo,
        private readonly moverNodo: MoverNodo,
    ) {}

    // Crear un nuevo nodo
    async crear(datos: CrearNodoDTO): Promise<Nodo> {
        return this.crearNodo.ejecutar(datos);
    }

    // Modificar el nombre de un nodo
    async modificar(datos: ModificarNodoDTO): Promise<Nodo> {
        return this.modificarNodo.ejecutar(datos);
    }

    // Enlistar los nodos dentro del nodo padre determinado, filtrar si hay criterios
    async buscar(criterios: BuscarNodosDTO): Promise<Nodo[]> {
        return this.buscarNodos.ejecutar(criterios);
    }

    // Cambiar el nodo padre de un nodo
    async mover(datos: MoverNodoDTO): Promise<Nodo> {
        return this.moverNodo.ejecutar(datos);
    }
    
    // Eliminar un nodo
    async eliminar(datos: EliminarNodoDTO): Promise<void> {
        this.eliminarNodo.ejecutar(datos);
    }
}