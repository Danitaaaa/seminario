import { ipcMain } from 'electron';
import type { ModeloDictado } from '../logicaNoPersistente/dictado/modeloDictado';

// Dictado del chat: el main solo se asegura de que el modelo esté en la compu.
// La transcripción la hace el renderer (worker con transformers.js) leyendo modelos://dictado/.
export function registerDictadoIpc(modelo: ModeloDictado): void {
  ipcMain.handle('dictado:listo', () => modelo.listo());

  // Mientras baja, avisa el avance (0 a 1) a la ventana que lo pidió.
  ipcMain.handle('dictado:preparar', async (event) => {
    await modelo.preparar((avance) => {
      if (!event.sender.isDestroyed()) event.sender.send('dictado:progreso', avance);
    });
    return true;
  });
}
