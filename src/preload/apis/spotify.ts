import { ipcRenderer } from 'electron';

// Funciones de Spotify expuestas al renderer.
export const spotifyApi = {
  spotifyEstadoCuenta: (usuarioId: number) => ipcRenderer.invoke('spotify:estadoCuenta', { usuarioId }),
  spotifyVincular: (usuarioId: number) => ipcRenderer.invoke('spotify:vincular', { usuarioId }),
  spotifyDesvincular: (usuarioId: number) => ipcRenderer.invoke('spotify:desvincular', { usuarioId }),
  spotifyToken: (usuarioId: number) => ipcRenderer.invoke('spotify:token', { usuarioId }),
  spotifyEstado: (usuarioId: number) => ipcRenderer.invoke('spotify:estado', { usuarioId }),
  spotifyReproducir: (usuarioId: number, idDispositivo?: string) =>
    ipcRenderer.invoke('spotify:reproducir', { usuarioId, idDispositivo }),
  spotifyPausar: (usuarioId: number, idDispositivo?: string) =>
    ipcRenderer.invoke('spotify:pausar', { usuarioId, idDispositivo }),
  spotifySiguiente: (usuarioId: number, idDispositivo?: string) =>
    ipcRenderer.invoke('spotify:siguiente', { usuarioId, idDispositivo }),
  spotifyAnterior: (usuarioId: number, idDispositivo?: string) =>
    ipcRenderer.invoke('spotify:anterior', { usuarioId, idDispositivo }),
  spotifyTransferir: (usuarioId: number, idDispositivo: string, reproducir: boolean) =>
    ipcRenderer.invoke('spotify:transferir', { usuarioId, idDispositivo, reproducir }),
  spotifyEstaGuardada: (usuarioId: number, uri: string) =>
    ipcRenderer.invoke('spotify:estaGuardada', { usuarioId, uri }),
};
