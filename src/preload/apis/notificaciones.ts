import { ipcRenderer, type IpcRendererEvent } from 'electron';

export const notificacionesApi = {
  listarNotificaciones: (datos: unknown) => ipcRenderer.invoke('notificaciones:listar', datos),
  marcarNotificacionesLeidas: (datos: unknown) => ipcRenderer.invoke('notificaciones:marcarLeidas', datos),
  obtenerSilencioNotificaciones: (datos: unknown) => ipcRenderer.invoke('notificaciones:obtenerSilencio', datos),
  silenciarNotificaciones: (datos: unknown) => ipcRenderer.invoke('notificaciones:silenciar', datos),
  vigilarNotificaciones: (datos: unknown) => ipcRenderer.invoke('notificaciones:vigilar', datos),
  detenerNotificaciones: () => ipcRenderer.invoke('notificaciones:detener'),
  // Llama a la función cada vez que llega un aviso nuevo. Devuelve cómo desuscribirse.
  alLlegarNotificacion: (escuchar: () => void) => {
    const manejador = (_e: IpcRendererEvent) => escuchar();
    ipcRenderer.on('notificaciones:nuevas', manejador);
    return () => ipcRenderer.removeListener('notificaciones:nuevas', manejador);
  },
  // Cuando sale un aviso en la compu (no silenciado), la ventana hace sonar el sonido.
  alSonarNotificacion: (escuchar: () => void) => {
    const manejador = (_e: IpcRendererEvent) => escuchar();
    ipcRenderer.on('notificaciones:sonar', manejador);
    return () => ipcRenderer.removeListener('notificaciones:sonar', manejador);
  },
  // Cuando se toca el aviso de Windows, se abre la campanita.
  alTocarNotificacion: (escuchar: () => void) => {
    const manejador = (_e: IpcRendererEvent) => escuchar();
    ipcRenderer.on('notificaciones:abrir', manejador);
    return () => ipcRenderer.removeListener('notificaciones:abrir', manejador);
  },
};