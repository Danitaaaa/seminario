import { ipcMain } from 'electron';
import { ClienteSpotify } from '../logicaNoPersistente/spotify/clienteSpotify';
import {
  controlSpotifySchema,
  transferirSpotifySchema,
  uriSpotifySchema,
  usuarioIdSpotifySchema,
} from '../logicaPersistente/gestionDeSpotify/dto';

// Registra los handlers IPC de Spotify. Cada uno valida con Zod antes de llamar al cliente.
export function registerSpotifyIpc(cliente: ClienteSpotify): void {
  ipcMain.handle('spotify:estadoCuenta', async (_event, datos: unknown) => {
    const { usuarioId } = usuarioIdSpotifySchema.parse(datos);
    return cliente.estadoCuenta(usuarioId);
  });

  ipcMain.handle('spotify:vincular', async (_event, datos: unknown) => {
    const { usuarioId } = usuarioIdSpotifySchema.parse(datos);
    await cliente.vincular(usuarioId);
  });

  ipcMain.handle('spotify:desvincular', async (_event, datos: unknown) => {
    const { usuarioId } = usuarioIdSpotifySchema.parse(datos);
    await cliente.desvincular(usuarioId);
  });

  // Token para el Web Playback SDK del renderer.
  ipcMain.handle('spotify:token', async (_event, datos: unknown) => {
    const { usuarioId } = usuarioIdSpotifySchema.parse(datos);
    return cliente.obtenerToken(usuarioId);
  });

  ipcMain.handle('spotify:estado', async (_event, datos: unknown) => {
    const { usuarioId } = usuarioIdSpotifySchema.parse(datos);
    return cliente.estadoReproduccion(usuarioId);
  });

  ipcMain.handle('spotify:reproducir', async (_event, datos: unknown) => {
    const { usuarioId, idDispositivo } = controlSpotifySchema.parse(datos);
    await cliente.reproducir(usuarioId, idDispositivo);
  });

  ipcMain.handle('spotify:pausar', async (_event, datos: unknown) => {
    const { usuarioId, idDispositivo } = controlSpotifySchema.parse(datos);
    await cliente.pausar(usuarioId, idDispositivo);
  });

  ipcMain.handle('spotify:siguiente', async (_event, datos: unknown) => {
    const { usuarioId, idDispositivo } = controlSpotifySchema.parse(datos);
    await cliente.siguiente(usuarioId, idDispositivo);
  });

  ipcMain.handle('spotify:anterior', async (_event, datos: unknown) => {
    const { usuarioId, idDispositivo } = controlSpotifySchema.parse(datos);
    await cliente.anterior(usuarioId, idDispositivo);
  });

  ipcMain.handle('spotify:transferir', async (_event, datos: unknown) => {
    const { usuarioId, idDispositivo, reproducir } = transferirSpotifySchema.parse(datos);
    await cliente.transferir(usuarioId, idDispositivo, reproducir);
  });

  ipcMain.handle('spotify:estaGuardada', async (_event, datos: unknown) => {
    const { usuarioId, uri } = uriSpotifySchema.parse(datos);
    return cliente.estaGuardada(usuarioId, uri);
  });
}
