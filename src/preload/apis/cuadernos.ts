import { ipcRenderer } from 'electron';

export const cuadernosApi = {
  listarCuadernos: (datos: unknown) => ipcRenderer.invoke('cuadernos:listar', datos),
  obtenerCuaderno: (datos: unknown) => ipcRenderer.invoke('cuadernos:obtener', datos),
  crearCuaderno: (datos: unknown) => ipcRenderer.invoke('cuadernos:crear', datos),
  modificarCuaderno: (datos: unknown) => ipcRenderer.invoke('cuadernos:modificar', datos),
  eliminarCuaderno: (datos: unknown) => ipcRenderer.invoke('cuadernos:eliminar', datos),
  agregarMazoCuaderno: (datos: unknown) => ipcRenderer.invoke('cuadernos:agregarMazo', datos),
  quitarMazoCuaderno: (datos: unknown) => ipcRenderer.invoke('cuadernos:quitarMazo', datos),
  crearNota: (datos: unknown) => ipcRenderer.invoke('cuadernos:crearNota', datos),
  modificarNota: (datos: unknown) => ipcRenderer.invoke('cuadernos:modificarNota', datos),
  eliminarNota: (datos: unknown) => ipcRenderer.invoke('cuadernos:eliminarNota', datos),
};
