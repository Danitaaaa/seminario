import { ipcMain } from 'electron';
import { Prueba } from '../administracionDePersistencia/Prueba';

export function registerPruebaIpc(prueba: Prueba): void {
  ipcMain.handle('prueba:obtenerSaludo', async () => {
    return prueba.obtenerUltimoSaludo();
  });
}
