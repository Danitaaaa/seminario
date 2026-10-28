import { ipcRenderer } from 'electron';

export const portadasProyectosApi = {
  obtenerPortadaProyecto: (datos: unknown) => ipcRenderer.invoke('proyectos:obtenerPortada', datos),
  elegirPortadaProyecto: (datos: unknown) => ipcRenderer.invoke('proyectos:elegirPortada', datos),
  quitarPortadaProyecto: (datos: unknown) => ipcRenderer.invoke('proyectos:quitarPortada', datos),
};