import { ipcRenderer } from 'electron';

export const proyectosApi = {
    crearProyecto: (datos: unknown) => ipcRenderer.invoke('proyectos:crear', datos),
    modificarProyecto: (datos: unknown) => ipcRenderer.invoke('proyectos:modificar', datos),
    eliminarProyecto: (datos: unknown) => ipcRenderer.invoke('proyectos:eliminar', datos),
    obtenerProyecto: (datos: unknown) => ipcRenderer.invoke('proyectos:obtener', datos),
    listarProyectos: (criterios: unknown) => ipcRenderer.invoke('proyectos:listar', criterios),

    agregarMiembro: (datos: unknown) => ipcRenderer.invoke('proyectos:agregarMiembro', datos),
    agregarMiembroPorMail: (datos: unknown) => ipcRenderer.invoke('proyectos:agregarMiembroPorMail', datos),
    cambiarRolMiembro: (datos: unknown) => ipcRenderer.invoke('proyectos:cambiarRolMiembro', datos),
    quitarMiembro: (datos: unknown) => ipcRenderer.invoke('proyectos:quitarMiembro', datos),
    listarMiembros: (criterios: unknown) => ipcRenderer.invoke('proyectos:listarMiembros', criterios),

    listarInvitaciones: (datos: unknown) => ipcRenderer.invoke('listarInvitaciones', datos),
    cancelarInvitacion: (datos: unknown) => ipcRenderer.invoke('cancelarInvitacion', datos),

    sincronizarProyecto: (datos: unknown) => ipcRenderer.invoke('proyectos:sincronizar', datos),
    unirseAProyecto: (datos: unknown) => ipcRenderer.invoke('proyectos:unirse', datos),
};