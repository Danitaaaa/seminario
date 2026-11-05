import { ipcRenderer, webUtils } from 'electron';

export const archivosApi = {
  listarArchivos: () => ipcRenderer.invoke('archivos:listar'),
  listarCarpetas: () => ipcRenderer.invoke('archivos:carpetas'),
  leerArchivo: (datos: unknown) => ipcRenderer.invoke('archivos:leer', datos),
  crearArchivo: (datos: unknown) => ipcRenderer.invoke('archivos:crear', datos),
  modificarArchivo: (datos: unknown) => ipcRenderer.invoke('archivos:modificar', datos),
  guardarArchivo: (datos: unknown) => ipcRenderer.invoke('archivos:guardar', datos),
  guardarDocx: (datos: unknown) => ipcRenderer.invoke('archivos:guardarDocx', datos),
  moverArchivos: (datos: unknown) => ipcRenderer.invoke('archivos:mover', datos),
  eliminarArchivo: (datos: unknown) => ipcRenderer.invoke('archivos:eliminar', datos),
  abrirExterno: (datos: unknown) => ipcRenderer.invoke('archivos:abrirExterno', datos),
  aplicacionesDisponibles: (datos: unknown) => ipcRenderer.invoke('archivos:aplicacionesDisponibles', datos),
  abrirConAplicacion: (datos: unknown) => ipcRenderer.invoke('archivos:abrirConAplicacion', datos),
  elegirAplicacion: (datos: unknown) => ipcRenderer.invoke('archivos:elegirAplicacion', datos),
  seleccionarArchivo: () => ipcRenderer.invoke('archivos:seleccionar'),
  subirCarpeta: (datos: unknown) => ipcRenderer.invoke('archivos:subirCarpeta', datos),
  importarRutas: (datos: unknown) => ipcRenderer.invoke('archivos:importar', datos),
  // Ruta en disco de un archivo o carpeta arrastrado (Electron ya no la pone en File.path).
  rutaDeArchivo: (archivo: File) => webUtils.getPathForFile(archivo),
};