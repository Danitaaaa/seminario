import { ipcMain } from 'electron';
import { z } from 'zod';
import { DriveServicio, type ResultadoAbrirDrive, type ResultadoRevisarDrive } from '../logicaNoPersistente/drive/driveServicio';
import { ObtenerArchivoDTOSchema } from '../logicaPersistente/gestionMaterialEstudio/dto';
import { ErrorLoginCancelado } from '../logicaNoPersistente/drive/oauthDrive';

// id del archivo y, si cambió en Syntra y en Google, qué versión conservar.
const SincronizarDriveDTOSchema = z.object({
  id: z.number().int().positive(),
  conservar: z.enum(['syntra', 'google']).optional(),
});

// Si el usuario canceló el inicio de sesión no es un error: el cartel ya se cerró.
async function salvoCancelado<T>(accion: () => Promise<T>, siCancela: T): Promise<T> {
  try {
    return await accion();
  } catch (error) {
    if (error instanceof ErrorLoginCancelado) return siCancela;
    throw error;
  }
}

// Se llama después de traer la versión de Drive (lo usa Sesión de estudio para traer los cambios).
type AlTraerVersion = (idArchivo: number) => Promise<unknown>;

// Handlers IPC de Google Drive: validan los datos con Zod antes de tocar el servicio.
export function registerDriveIpc(drive: DriveServicio, cancelarLogin: () => void, alTraerVersion?: AlTraerVersion): void {
  const avisarTraido = async (id: number) => {
    try {
      await alTraerVersion?.(id);
    } catch (error) {
      console.error('[Drive] No se pudo actualizar la sesión de estudio del archivo:', error);
    }
  };

  // Devuelve 'conflicto' si cambió en Syntra y en Google: el renderer pregunta cuál conservar y vuelve a llamar.
  ipcMain.handle('drive:abrir', async (_event, datos: unknown): Promise<ResultadoAbrirDrive> => {
    const { id, conservar } = SincronizarDriveDTOSchema.parse(datos);
    const resultado = await salvoCancelado(() => drive.abrirEnDrive(id, conservar), 'abierto' as const);
    if (conservar === 'google') await avisarTraido(id);
    return resultado;
  });

  // Al abrir un archivo en Syntra: trae los cambios hechos en Google, si los hay.
  ipcMain.handle('drive:revisar', async (_event, datos: unknown): Promise<ResultadoRevisarDrive> => {
    const { id, conservar } = SincronizarDriveDTOSchema.parse(datos);
    const resultado = await salvoCancelado(() => drive.revisarAlAbrir(id, conservar), 'nada' as const);
    if (resultado === 'traido') await avisarTraido(id);
    return resultado;
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
    await avisarTraido(id);
  });
}
