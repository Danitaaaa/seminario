import { dialog, ipcMain } from 'electron';
import { PortadasProyectos } from '../administracionDePersistencia/portadasProyectos';
import { PortadaProyectoDTOSchema } from '../logicaPersistente/gestionDeProyectos/dto';

export function registerPortadasProyectosIpc(portadas: PortadasProyectos): void {
  ipcMain.handle('proyectos:obtenerPortada', async (_e, datos: unknown) =>
    portadas.obtener(PortadaProyectoDTOSchema.parse(datos))
  );

  // El diálogo se abre acá: el renderer nunca recibe rutas del disco.
  ipcMain.handle('proyectos:elegirPortada', async (_e, datos: unknown) => {
    const validado = PortadaProyectoDTOSchema.parse(datos);
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Elegir portada del proyecto',
      properties: ['openFile'],
      filters: [{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    });
    if (canceled || filePaths.length === 0) return null;
    return portadas.actualizar(validado, filePaths[0]);
  });

  ipcMain.handle('proyectos:quitarPortada', async (_e, datos: unknown) => {
    await portadas.quitar(PortadaProyectoDTOSchema.parse(datos));
  });
}