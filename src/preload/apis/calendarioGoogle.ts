import { ipcRenderer } from 'electron';

export const calendarioGoogleApi = {
  estadoCalendarioGoogle: () => ipcRenderer.invoke('calendarioGoogle:estado'),
  conectarCalendarioGoogle: () => ipcRenderer.invoke('calendarioGoogle:conectar'),
  sincronizarCalendarioGoogle: () => ipcRenderer.invoke('calendarioGoogle:sincronizar'),
  desconectarCalendarioGoogle: () => ipcRenderer.invoke('calendarioGoogle:desconectar'),
  cancelarCalendarioGoogle: () => ipcRenderer.invoke('calendarioGoogle:cancelar'),
  configurarCalendarioGoogle: (datos: { traerCambios: boolean }) => ipcRenderer.invoke('calendarioGoogle:configurar', datos),
  permitirLecturaCalendarioGoogle: () => ipcRenderer.invoke('calendarioGoogle:permitirLectura'),
  listarCalendariosGoogle: () => ipcRenderer.invoke('calendarioGoogle:listarCalendarios'),
  elegirCalendariosGoogle: (datos: { ids: string[] }) => ipcRenderer.invoke('calendarioGoogle:elegirCalendarios', datos),
  eventosOtrosCalendarios: (datos: { desde: string; hasta: string }) => ipcRenderer.invoke('calendarioGoogle:eventosOtros', datos),
  abrirEventoGoogle: (datos: { id: string }) => ipcRenderer.invoke('calendarioGoogle:abrirEvento', datos),
};
