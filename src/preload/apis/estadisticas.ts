import { ipcRenderer } from 'electron';

export const estadisticasApi = {
  resumenProyectos: (datos: unknown) => ipcRenderer.invoke('estadisticas:proyectos', datos),
  resumenSesionesEstudio: (datos: unknown) => ipcRenderer.invoke('estadisticas:sesiones', datos),
};