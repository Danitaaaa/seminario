import { ipcRenderer } from 'electron';

export const calendarioGoogleApi = {
  estadoCalendarioGoogle: () => ipcRenderer.invoke('calendarioGoogle:estado'),
  conectarCalendarioGoogle: () => ipcRenderer.invoke('calendarioGoogle:conectar'),
  sincronizarCalendarioGoogle: () => ipcRenderer.invoke('calendarioGoogle:sincronizar'),
  desconectarCalendarioGoogle: () => ipcRenderer.invoke('calendarioGoogle:desconectar'),
  cancelarCalendarioGoogle: () => ipcRenderer.invoke('calendarioGoogle:cancelar'),
};
