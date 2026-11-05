import { ipcRenderer } from 'electron';

export const cuadernosApi = {
  listarCuadernos: (datos: unknown) => ipcRenderer.invoke('cuadernos:listar', datos),
  obtenerCuaderno: (datos: unknown) => ipcRenderer.invoke('cuadernos:obtener', datos),
  crearNota: (datos: unknown) => ipcRenderer.invoke('cuadernos:crearNota', datos),
  modificarNota: (datos: unknown) => ipcRenderer.invoke('cuadernos:modificarNota', datos),
  eliminarNota: (datos: unknown) => ipcRenderer.invoke('cuadernos:eliminarNota', datos),
};
