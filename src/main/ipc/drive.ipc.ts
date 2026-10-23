import { ipcMain } from 'electron';
import { DriveServicio } from '../logicaNoPersistente/drive/driveServicio';
import { ObtenerArchivoDTOSchema } from '../logicaPersistente/gestionMaterialEstudio/dto';

// Handlers IPC de Google Drive: validan el id con Zod antes de tocar el servicio.
export function registerDriveIpc(drive: DriveServicio): void {
  ipcMain.handle('drive:abrir', async (_event, datos: unknown) => {
    const { id } = ObtenerArchivoDTOSchema.parse(datos);
    await drive.abrirEnDrive(id);
  });

  ipcMain.handle('drive:traerVersion', async (_event, datos: unknown) => {
    const { id } = ObtenerArchivoDTOSchema.parse(datos);
    await drive.traerVersion(id);
  });
}