import { ipcRenderer } from 'electron';

export const inicioApi = {
  obtenerFondoInicio: (datos: unknown) => ipcRenderer.invoke('inicio:obtenerFondo', datos),
  elegirFondoInicio: (datos: unknown) => ipcRenderer.invoke('inicio:elegirFondo', datos),
};