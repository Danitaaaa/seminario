import { ipcRenderer } from 'electron';

export const eventosApi = {
  crearEvento: (datos: unknown) => ipcRenderer.invoke('eventos:crear', datos),
  listarEventos: (datos: unknown) => ipcRenderer.invoke('eventos:listar', datos),
  modificarEvento: (datos: unknown) => ipcRenderer.invoke('eventos:modificar', datos),
  eliminarEvento: (datos: unknown) => ipcRenderer.invoke('eventos:eliminar', datos),
};
