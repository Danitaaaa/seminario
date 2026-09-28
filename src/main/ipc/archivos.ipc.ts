import { app, ipcMain, dialog } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Archivos } from '../administracionDePersistencia/Archivos';
import { crearArchivoSchema, modificarArchivoSchema, eliminarArchivoSchema, moverArchivosSchema } from '../logicaPersistente/gestionDeArchivos/dto';

// Carpeta propia de la app donde viven las copias de los archivos subidos.
const CARPETA_MATERIAL = path.join(app.getPath('userData'), 'material');

// Handlers IPC del módulo Archivos — validan con Zod antes de tocar la fachada.
export function registerArchivosIpc(archivos: Archivos): void {
  ipcMain.handle('archivos:crear', async (_event, datos: unknown) => {
    const validado = crearArchivoSchema.parse(datos);

    // Copia el archivo elegido a la carpeta de material de la app — nunca toca el original.
    fs.mkdirSync(CARPETA_MATERIAL, { recursive: true });
    const nombreFisico = `${crypto.randomUUID()}.${validado.extension}`;
    const rutaCopia = path.join(CARPETA_MATERIAL, nombreFisico);
    fs.copyFileSync(validado.rutaFisica, rutaCopia);

    return archivos.crear({ ...validado, rutaFisica: rutaCopia });
  });

// ...dentro de registerArchivosIpc, junto a los otros handle:

  ipcMain.handle('archivos:carpetas', async () => {
    return archivos.carpetas();
  });

  ipcMain.handle('archivos:mover', async (_event, datos: unknown) => {
    const validado = moverArchivosSchema.parse(datos);
    return archivos.mover(validado);
  });

  ipcMain.handle('archivos:listar', async () => {
    return archivos.listar();
  });

  ipcMain.handle('archivos:modificar', async (_event, datos: unknown) => {
    const validado = modificarArchivoSchema.parse(datos);
    return archivos.modificar(validado);
  });

  ipcMain.handle('archivos:eliminar', async (_event, datos: unknown) => {
    const validado = eliminarArchivoSchema.parse(datos);
    return archivos.eliminar(validado);
  });

  // Abre el selector de archivos del SO y devuelve la metadata básica del elegido.
  ipcMain.handle('archivos:seleccionar', async () => {
    const resultado = await dialog.showOpenDialog({ properties: ['openFile'] });
    if (resultado.canceled || resultado.filePaths.length === 0) return null;

    const rutaFisica = resultado.filePaths[0];
    const stats = fs.statSync(rutaFisica);
    const extension = path.extname(rutaFisica).replace('.', '');
    const nombre = path.basename(rutaFisica, path.extname(rutaFisica));

    return { nombre, extension, rutaFisica, tamanio: stats.size };
  });
}