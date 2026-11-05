import { ipcRenderer } from 'electron';

export const driveApi = {
  abrirEnDrive: (datos: unknown) => ipcRenderer.invoke('drive:abrir', datos),
  traerVersionDrive: (datos: unknown) => ipcRenderer.invoke('drive:traerVersion', datos),
  cancelarDrive: () => ipcRenderer.invoke('drive:cancelar'),
};