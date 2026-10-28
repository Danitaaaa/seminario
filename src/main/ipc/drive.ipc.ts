import { ipcMain } from 'electron';
import { DriveServicio } from '../logicaNoPersistente/drive/driveServicio';
import { ObtenerArchivoDTOSchema } from '../logicaPersistente/gestionMaterialEstudio/dto';

// Se llama después de traer la versión de Drive (lo usa Sesión de estudio para traer los cambios).
type AlTraerVersion = (idArchivo: number) => Promise<unknown>;

// Handlers IPC de Google Drive: validan el id con Zod antes de tocar el servicio.
export function registerDriveIpc(drive: DriveServicio, alTraerVersion?: AlTraerVersion): void {
  ipcMain.handle('drive:abrir', async (_event, datos: unknown) => {
    const { id } = ObtenerArchivoDTOSchema.parse(datos);
    await drive.abrirEnDrive(id);
  });

  ipcMain.handle('drive:traerVersion', async (_event, datos: unknown) => {
    const { id } = ObtenerArchivoDTOSchema.parse(datos);
    await drive.traerVersion(id);
    try {
      await alTraerVersion?.(id);
    } catch (error) {
      console.error('[Drive] No se pudo actualizar la sesión de estudio del archivo:', error);
    }
  });
}