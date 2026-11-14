import { ipcRenderer } from 'electron';

export const bienestarApi = {
  bienestarActivo: (datos: unknown) => ipcRenderer.invoke('bienestar:activo', datos),
  cambiarBienestar: (datos: unknown) => ipcRenderer.invoke('bienestar:cambiar', datos),
};
