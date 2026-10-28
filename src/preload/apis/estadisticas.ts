import { ipcRenderer } from 'electron';

export const estadisticasApi = {
  resumenProyectos: (datos: unknown) => ipcRenderer.invoke('estadisticas:proyectos', datos),
  resumenMaterial: (datos: unknown) => ipcRenderer.invoke('estadisticas:material', datos),
  resumenSesionesEstudio: (datos: unknown) => ipcRenderer.invoke('estadisticas:sesiones', datos),
};
