import { ipcRenderer } from 'electron';

export const archivosApi = {
  crearArchivo: (datos: unknown) => ipcRenderer.invoke('archivos:crear', datos),
  listarArchivos: () => ipcRenderer.invoke('archivos:listar'),
  seleccionarArchivo: () => ipcRenderer.invoke('archivos:seleccionar'),
  modificarArchivo: (datos: unknown) => ipcRenderer.invoke('archivos:modificar', datos),
  eliminarArchivo: (datos: unknown) => ipcRenderer.invoke('archivos:eliminar', datos),
  listarCarpetas: () => ipcRenderer.invoke('archivos:carpetas'),
  moverArchivos: (datos: unknown) => ipcRenderer.invoke('archivos:mover', datos),
};