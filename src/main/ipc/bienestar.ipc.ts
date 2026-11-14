import { ipcMain } from 'electron';
import { Bienestar } from '../administracionDePersistencia/bienestar';
import { cambiarBienestarSchema, usuarioBienestarSchema } from '../logicaPersistente/gestionDeBienestar/dto';

export function registerBienestarIpc(bienestar: Bienestar): void {
  ipcMain.handle('bienestar:activo', async (_e, datos: unknown) =>
    bienestar.activo(usuarioBienestarSchema.parse(datos).usuarioId)
  );
  ipcMain.handle('bienestar:cambiar', async (_e, datos: unknown) =>
    bienestar.cambiar(cambiarBienestarSchema.parse(datos))
  );
}
