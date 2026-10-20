import { Proyecto, ProyectoMiembro } from '../logicaPersistente/gestionDeProyectos/entidades';
import {
    CrearProyectoDTO,
    ModificarProyectoDTO,
    EliminarProyectoDTO,
    ObtenerProyectoDTO,
    ListarProyectosDTO,
    AgregarMiembroDTO,
    QuitarMiembroDTO,
    ListarMiembrosDTO,
    SincronizarProyectoDTO,
    UnirseAProyectoDTO,
} from '../logicaPersistente/gestionDeProyectos/dto';

import { CrearProyecto } from '../logicaPersistente/gestionDeProyectos/crearProyecto';
import { ModificarProyecto } from '../logicaPersistente/gestionDeProyectos/modificarProyecto';
import { EliminarProyecto } from '../logicaPersistente/gestionDeProyectos/eliminarProyectp';
import { ObtenerProyecto } from '../logicaPersistente/gestionDeProyectos/obtenerProyecto';
import { ListarProyectos } from '../logicaPersistente/gestionDeProyectos/listarProyectos';
import { AgregarMiembro } from '../logicaPersistente/gestionDeProyectos/agregarMiembro';
import { QuitarMiembro } from '../logicaPersistente/gestionDeProyectos/quitarMiebro';
import { ListarMiembros } from '../logicaPersistente/gestionDeProyectos/listarMienbros';
import { SincronizarProyecto } from '../logicaPersistente/gestionDeProyectos/sincronizarProyecto';

export class Proyectos {
    constructor(
        private readonly crearProyecto: CrearProyecto,
        private readonly modificarProyecto: ModificarProyecto,
        private readonly eliminarProyecto: EliminarProyecto,
        private readonly obtenerProyecto: ObtenerProyecto,
        private readonly listarProyectos: ListarProyectos,
        private readonly agregarMiembro_: AgregarMiembro,
        private readonly quitarMiembro_: QuitarMiembro,
        private readonly listarMiembros_: ListarMiembros,
        private readonly sincronizarProyecto: SincronizarProyecto,
    ) {}

    /* ---------- Proyectos ---------- */

    // Crear un nuevo proyecto (el usuario creador queda como propietario)
    async crear(datos: CrearProyectoDTO): Promise<Proyecto> {
        return this.crearProyecto.ejecutar(datos);
    }

    // Modificar los datos de un proyecto (según permisos del solicitante)
    async modificar(datos: ModificarProyectoDTO): Promise<Proyecto> {
        return this.modificarProyecto.ejecutar(datos);
    }

    // Eliminar un proyecto
    async eliminar(datos: EliminarProyectoDTO): Promise<void> {
        await this.eliminarProyecto.ejecutar(datos);
    }

    // Obtener un proyecto por id
    async obtener(datos: ObtenerProyectoDTO): Promise<Proyecto> {
        return this.obtenerProyecto.ejecutar(datos);
    }

    // Listar los proyectos de un usuario, con búsqueda y orden opcionales
    async listar(criterios: ListarProyectosDTO): Promise<Proyecto[]> {
        return this.listarProyectos.ejecutar(criterios);
    }

    /* ---------- Miembros ---------- */

    // Agregar un miembro a un proyecto
    async agregarMiembro(datos: AgregarMiembroDTO): Promise<ProyectoMiembro> {
        return this.agregarMiembro_.ejecutar(datos);
    }

    // Quitar un miembro (o abandonar el proyecto si coincide con el solicitante)
    async quitarMiembro(datos: QuitarMiembroDTO): Promise<void> {
        await this.quitarMiembro_.ejecutar(datos);
    }

    // Listar los miembros de un proyecto
    async listarMiembros(criterios: ListarMiembrosDTO): Promise<ProyectoMiembro[]> {
        return this.listarMiembros_.ejecutar(criterios);
    }

    /* ---------- Sincronización ---------- */

    // Sincronizar un proyecto con el servidor
    async sincronizar(datos: SincronizarProyectoDTO): Promise<void> {
        await this.sincronizarProyecto.ejecutar(datos);
    }

    // Unirse a un proyecto mediante un enlace
    async unirse(datos: UnirseAProyectoDTO): Promise<Proyecto> {
        // TODO: implementar el caso de uso UnirseAProyecto y delegar acá
        throw new Error('unirse todavía no está implementado');
    }
}