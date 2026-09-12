import { ipcRenderer } from 'electron';

export const pruebaApi = {
  obtenerSaludo: () => ipcRenderer.invoke('prueba:obtenerSaludo'),
};
