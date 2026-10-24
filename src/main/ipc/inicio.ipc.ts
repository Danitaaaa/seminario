import { dialog, ipcMain } from 'electron';
import { Inicio } from '../administracionDePersistencia/inicio';
import { fondoInicioSchema } from '../logicaPersistente/gestionDeInicio/dto';

export function registerInicioIpc(inicio: Inicio): void {
  ipcMain.handle('inicio:obtenerFondo', async (_e, datos: unknown) =>
    inicio.obtenerFondo(fondoInicioSchema.parse(datos))
  );

  // El diálogo se abre acá: el renderer nunca recibe rutas del disco.
  ipcMain.handle('inicio:elegirFondo', async (_e, datos: unknown) => {
    const { id } = fondoInicioSchema.parse(datos);
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Elegir imagen de fondo',
      properties: ['openFile'],
      filters: [{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    });
    if (canceled || filePaths.length === 0) return null;
    return inicio.actualizarFondo(id, filePaths[0]);
  });
}