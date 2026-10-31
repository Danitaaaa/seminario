import { ipcMain } from 'electron';
import { Proyectos } from '../administracionDePersistencia/proyectos';
import {
    CrearProyectoDTOSchema,
    ModificarProyectoDTOSchema,
    EliminarProyectoDTOSchema,
    ObtenerProyectoDTOSchema,
    ListarProyectosDTOSchema,
    AgregarMiembroDTOSchema,
    AgregarMiembroPorMailDTOSchema,
    CambiarRolMiembroDTOSchema,
    QuitarMiembroDTOSchema,
    ListarMiembrosDTOSchema,
    SincronizarProyectoDTOSchema,
    ListarInvitacionesDTOSchema,
    CancelarInvitacionDTOSchema,
} from '../logicaPersistente/gestionDeProyectos/dto';
import { REGLAS } from '../logicaPersistente/gestionDeProyectos/reglasPermisos';


export function registrarProyectosIpc(proyectos: Proyectos): void {
    /* ---------- Proyectos ---------- */

    ipcMain.handle('proyectos:crear', async (_event, datos: unknown) => {
        const validado = CrearProyectoDTOSchema.parse(datos);
        return proyectos.crear(validado);
    });

    ipcMain.handle('proyectos:modificar', async (_event, datos: unknown) => {
        const validado = ModificarProyectoDTOSchema.parse(datos);
        return proyectos.modificar(validado);
    });

    ipcMain.handle('proyectos:eliminar', async (_event, datos: unknown) => {
        const validado = EliminarProyectoDTOSchema.parse(datos);
        return proyectos.eliminar(validado);
    });

    ipcMain.handle('proyectos:obtener', async (_event, datos: unknown) => {
        const validado = ObtenerProyectoDTOSchema.parse(datos);
        return proyectos.obtener(validado);
    });

    ipcMain.handle('proyectos:listar', async (_event, criterios: unknown) => {
        const validado = ListarProyectosDTOSchema.parse(criterios);
        return proyectos.listar(validado);
    });

    /* ---------- Miembros ---------- */

    ipcMain.handle('proyectos:agregarMiembro', async (_event, datos: unknown) => {
        const validado = AgregarMiembroDTOSchema.parse(datos);
        return proyectos.agregarMiembro(validado);
    });

    ipcMain.handle('proyectos:agregarMiembroPorMail', async (_event, datos: unknown) => {
        const validado = AgregarMiembroPorMailDTOSchema.parse(datos);
        return proyectos.agregarMiembroPorMail(validado);
    });

    ipcMain.handle('proyectos:cambiarRolMiembro', async (_event, datos: unknown) => {
        const validado = CambiarRolMiembroDTOSchema.parse(datos);
        return proyectos.cambiarRolMiembro(validado);
    });

    ipcMain.handle('proyectos:quitarMiembro', async (_event, datos: unknown) => {
        const validado = QuitarMiembroDTOSchema.parse(datos);
        return proyectos.quitarMiembro(validado);
    });

    ipcMain.handle('proyectos:listarMiembros', async (_event, criterios: unknown) => {
        const validado = ListarMiembrosDTOSchema.parse(criterios);
        return proyectos.listarMiembros(validado);
    });

    /* ---------- Invitaciones ---------- */

    ipcMain.handle('listarInvitaciones', async (_event, datos: unknown) => {
        const validado = ListarInvitacionesDTOSchema.parse(datos);
        return proyectos.listarInvitaciones(validado);
    });

    ipcMain.handle('cancelarInvitacion', async (_event, datos: unknown) => {
        const validado = CancelarInvitacionDTOSchema.parse(datos);
        return proyectos.cancelarInvitacion(validado);
    });
    
    /* ---------- Sincronización ---------- */

    ipcMain.handle('proyectos:sincronizar', async (_event, datos: unknown) => {
        const validado = SincronizarProyectoDTOSchema.parse(datos);
        return proyectos.sincronizar(validado);
    });

    ipcMain.handle('permisos:obtenerReglas', () => REGLAS);
}