import { ipcRenderer } from 'electron';

export const notasRapidasApi = {
  listarNotasRapidas: (datos: unknown) => ipcRenderer.invoke('notasRapidas:listar', datos),
  crearNotaRapida: (datos: unknown) => ipcRenderer.invoke('notasRapidas:crear', datos),
  modificarNotaRapida: (datos: unknown) => ipcRenderer.invoke('notasRapidas:modificar', datos),
  eliminarNotaRapida: (datos: unknown) => ipcRenderer.invoke('notasRapidas:eliminar', datos),
};
