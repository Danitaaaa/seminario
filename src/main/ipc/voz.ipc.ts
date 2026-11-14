import { app, ipcMain, type BrowserWindow } from 'electron';

// Electron sabe si NVDA, JAWS o el Narrador están activos.
// También avisa si se prenden o apagan con la app abierta.
export function registerVozIpc(obtenerVentana: () => BrowserWindow | null): void {
  ipcMain.handle('voz:lectorActivo', () => app.isAccessibilitySupportEnabled());

  app.on('accessibility-support-changed', (_evento, activo) => {
    obtenerVentana()?.webContents.send('voz:lectorCambio', activo);
  });
}