import { ipcRenderer } from 'electron';

export const copiaSeguridadApi = {
  estadoCopiaSeguridad: () => ipcRenderer.invoke('copiaSeguridad:estado'),
  configurarCopiaSeguridad: (datos: { automatica: boolean }) => ipcRenderer.invoke('copiaSeguridad:configurar', datos),
  copiarADrive: (datos: { password?: string }) => ipcRenderer.invoke('copiaSeguridad:copiarADrive', datos),
  guardarCopiaEnArchivo: (datos: { password?: string }) => ipcRenderer.invoke('copiaSeguridad:guardarEnArchivo', datos),
  puedeRestaurarDesdeInicio: () => ipcRenderer.invoke('copiaSeguridad:puedeRestaurarDesdeInicio'),
  copiasEnDrive: () => ipcRenderer.invoke('copiaSeguridad:copiasEnDrive'),
  elegirArchivoCopia: () => ipcRenderer.invoke('copiaSeguridad:elegirArchivo'),
  restaurarCopia: (datos: { origen: { drive: string } | { archivo: true }; password: string; desdeInicio: boolean }) =>
    ipcRenderer.invoke('copiaSeguridad:restaurar', datos),
  reiniciarSyntra: () => ipcRenderer.invoke('copiaSeguridad:reiniciar'),
};
