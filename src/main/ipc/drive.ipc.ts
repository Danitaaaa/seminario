import { ipcMain } from 'electron';
import { DriveServicio } from '../logicaNoPersistente/drive/driveServicio';
import { ObtenerArchivoDTOSchema } from '../logicaPersistente/gestionMaterialEstudio/dto';
import { ErrorLoginCancelado } from '../logicaNoPersistente/drive/oauthDrive';

// Si el usuario canceló el inicio de sesión no es un error: el cartel ya se cerró.
async function salvoCancelado(accion: () => Promise<void>): Promise<void> {
  try {
    await accion();
  } catch (error) {
    if (!(error instanceof ErrorLoginCancelado)) throw error;
  }
}

// Se llama después de traer la versión de Drive (lo usa Sesión de estudio para traer los cambios).
type AlTraerVersion = (idArchivo: number) => Promise<unknown>;

// Handlers IPC de Google Drive: validan el id con Zod antes de tocar el servicio.
export function registerDriveIpc(drive: DriveServicio, cancelarLogin: () => void, alTraerVersion?: AlTraerVersion): void {
  ipcMain.handle('drive:abrir', async (_event, datos: unknown) => {
    const { id } = ObtenerArchivoDTOSchema.parse(datos);
    await salvoCancelado(() => drive.abrirEnDrive(id));
  });

  // Deja de esperar el inicio de sesión con Google.
  ipcMain.handle('drive:cancelar', () => cancelarLogin());

  ipcMain.handle('drive:traerVersion', async (_event, datos: unknown) => {
    const { id } = ObtenerArchivoDTOSchema.parse(datos);
    try {
      await drive.traerVersion(id);
    } catch (error) {
      if (error instanceof ErrorLoginCancelado) return;
      throw error;
    }
    try {
      await alTraerVersion?.(id);
    } catch (error) {
      console.error('[Drive] No se pudo actualizar la sesión de estudio del archivo:', error);
    }
  });
}