import { ipcRenderer } from 'electron';

export const tareasApi = {
  listarTareas: (datos: unknown) => ipcRenderer.invoke('tareas:listar', datos),
  crearTarea: (datos: unknown) => ipcRenderer.invoke('tareas:crear', datos),
  modificarTarea: (datos: unknown) => ipcRenderer.invoke('tareas:modificar', datos),
  alternarTarea: (datos: unknown) => ipcRenderer.invoke('tareas:alternar', datos),
  asignarTarea: (datos: unknown) => ipcRenderer.invoke('tareas:asignar', datos),
  repartirTareas: (datos: unknown) => ipcRenderer.invoke('tareas:repartir', datos),
  eliminarTarea: (datos: unknown) => ipcRenderer.invoke('tareas:eliminar', datos),
};
