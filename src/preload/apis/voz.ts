import { ipcRenderer, type IpcRendererEvent } from 'electron';

export const vozApi = {
  lectorPantallaActivo: () => ipcRenderer.invoke('voz:lectorActivo'),
  // Llama a la función cuando se prende o apaga el lector. Devuelve cómo desuscribirse.
  alCambiarLector: (escuchar: (activo: boolean) => void) => {
    const manejador = (_e: IpcRendererEvent, activo: boolean) => escuchar(activo);
    ipcRenderer.on('voz:lectorCambio', manejador);
    return () => ipcRenderer.removeListener('voz:lectorCambio', manejador);
  },
};