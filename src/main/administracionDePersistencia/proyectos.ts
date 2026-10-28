import { Proyecto, ProyectoMiembro } from '../logicaPersistente/gestionDeProyectos/entidades';
import {
    CrearProyectoDTO,
    ModificarProyectoDTO,
    EliminarProyectoDTO,
    ObtenerProyectoDTO,
    ListarProyectosDTO,
    AgregarMiembroDTO,
    AgregarMiembroPorMailDTO,
    CambiarRolMiembroDTO,
    QuitarMiembroDTO,
    ListarMiembrosDTO,
    SincronizarProyectoDTO,
    ListarInvitacionesDTO,
    CancelarInvitacionDTO,
} from '../logicaPersistente/gestionDeProyectos/dto';

import { CrearProyecto } from '../logicaPersistente/gestionDeProyectos/crearProyecto';
import { ModificarProyecto } from '../logicaPersistente/gestionDeProyectos/modificarProyecto';
import { EliminarProyecto } from '../logicaPersistente/gestionDeProyectos/eliminarProyecto';
import { ObtenerProyecto } from '../logicaPersistente/gestionDeProyectos/obtenerProyecto';
import { ListarProyectos } from '../logicaPersistente/gestionDeProyectos/listarProyectos';
import { AgregarMiembro } from '../logicaPersistente/gestionDeProyectos/agregarMiembro';
import { AgregarMiembroPorMail } from '../logicaPersistente/gestionDeProyectos/agregarMiembroPorMail';
import { CambiarRolMiembro } from '../logicaPersistente/gestionDeProyectos/cambiarRolMiembro';
import { QuitarMiembro } from '../logicaPersistente/gestionDeProyectos/quitarMiembro';
import { ListarMiembros } from '../logicaPersistente/gestionDeProyectos/listarMiembros';
import { SincronizarProyecto } from '../logicaPersistente/gestionDeProyectos/sincronizarProyecto';
import { ListarInvitaciones } from '../logicaPersistente/gestionDeProyectos/listarInvitaciones';
import { CancelarInvitacion } from '../logicaPersistente/gestionDeProyectos/cancelarInvitacion';

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
        private readonly agregarMiembroPorMail_: AgregarMiembroPorMail,
        private readonly cambiarRolMiembro_: CambiarRolMiembro,
        private readonly listarInvitaciones_: ListarInvitaciones,
        private readonly cancelarInvitacion_: CancelarInvitacion,
    ) {}

    /* ---------- Proyectos ---------- */

    async crear(datos: CrearProyectoDTO): Promise<Proyecto> {
        return this.crearProyecto.ejecutar(datos);
    }

    async modificar(datos: ModificarProyectoDTO): Promise<Proyecto> {
        return this.modificarProyecto.ejecutar(datos);
    }

    async eliminar(datos: EliminarProyectoDTO): Promise<void> {
        await this.eliminarProyecto.ejecutar(datos);
    }

    async obtener(datos: ObtenerProyectoDTO): Promise<Proyecto> {
        return this.obtenerProyecto.ejecutar(datos);
    }

    async listar(criterios: ListarProyectosDTO): Promise<Proyecto[]> {
        return this.listarProyectos.ejecutar(criterios);
    }

    /* ---------- Miembros ---------- */

    async agregarMiembro(datos: AgregarMiembroDTO): Promise<ProyectoMiembro> {
        return this.agregarMiembro_.ejecutar(datos);
    }

    async agregarMiembroPorMail(datos: AgregarMiembroPorMailDTO): Promise<{ pendiente: true; mail: string }> {
        return this.agregarMiembroPorMail_.ejecutar(datos);
    }

    async cambiarRolMiembro(datos: CambiarRolMiembroDTO): Promise<ProyectoMiembro> {
        return this.cambiarRolMiembro_.ejecutar(datos);
    }

    async quitarMiembro(datos: QuitarMiembroDTO): Promise<void> {
        await this.quitarMiembro_.ejecutar(datos);
    }

    async listarMiembros(criterios: ListarMiembrosDTO): Promise<ProyectoMiembro[]> {
        return this.listarMiembros_.ejecutar(criterios);
    }

    /* ---------- Invitaciones ---------- */

    async listarInvitaciones(criterios: ListarInvitacionesDTO): Promise<unknown[]> {
        return this.listarInvitaciones_.ejecutar(criterios);
    }

    async cancelarInvitacion(datos: CancelarInvitacionDTO): Promise<void> {
        await this.cancelarInvitacion_.ejecutar(datos);
    }

    /* ---------- Sincronización ---------- */

    async sincronizar(datos: SincronizarProyectoDTO): Promise<void> {
        await this.sincronizarProyecto.ejecutar(datos);
    }
}