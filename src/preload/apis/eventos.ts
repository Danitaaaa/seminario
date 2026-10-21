import { ipcRenderer } from 'electron';

export const eventosApi = {
  listarEventos: (datos: unknown) => ipcRenderer.invoke('eventos:listar', datos),
  crearEvento: (datos: unknown) => ipcRenderer.invoke('eventos:crear', datos),
  modificarEvento: (datos: unknown) => ipcRenderer.invoke('eventos:modificar', datos),
  eliminarEvento: (datos: unknown) => ipcRenderer.invoke('eventos:eliminar', datos),
};
