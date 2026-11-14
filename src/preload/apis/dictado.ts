import { ipcRenderer, type IpcRendererEvent } from 'electron';

export const dictadoApi = {
  dictadoListo: (): Promise<boolean> => ipcRenderer.invoke('dictado:listo'),
  // Baja el modelo de Whisper si falta (la primera vez). Termina cuando ya se puede dictar.
  prepararDictado: (): Promise<boolean> => ipcRenderer.invoke('dictado:preparar'),
  alProgresoDictado: (escuchar: (avance: number) => void) => {
    const manejador = (_e: IpcRendererEvent, avance: number) => escuchar(avance);
    ipcRenderer.on('dictado:progreso', manejador);
    return () => ipcRenderer.removeListener('dictado:progreso', manejador);
  },
};
