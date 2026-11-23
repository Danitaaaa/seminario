import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import { CopiaSeguridad } from '../administracionDePersistencia/copiaSeguridad';
import { configurarCopiaSchema, hacerCopiaSchema, restaurarCopiaSchema } from '../logicaPersistente/gestionDeCopiaSeguridad/dto';

// Copia de seguridad: valida con Zod y llama a la fachada. Los cuadros para elegir archivo quedan acá;
// la ruta elegida nunca va a la pantalla (se recuerda en el main hasta restaurar).
export function registerCopiaSeguridadIpc(copia: CopiaSeguridad): void {
  let archivoElegido: string | null = null;

  ipcMain.handle('copiaSeguridad:estado', () => copia.estado());

  ipcMain.handle('copiaSeguridad:configurar', (_event, datos: unknown) => {
    const { automatica } = configurarCopiaSchema.parse(datos);
    return copia.configurar(automatica);
  });

  ipcMain.handle('copiaSeguridad:copiarADrive', (_event, datos: unknown) => {
    const { password } = hacerCopiaSchema.parse(datos);
    return copia.copiarADrive(password);
  });

  // Pregunta dónde guardar el archivo .syntra. Devuelve null si se canceló.
  ipcMain.handle('copiaSeguridad:guardarEnArchivo', async (event, datos: unknown) => {
    const { password } = hacerCopiaSchema.parse(datos);
    const ventana = BrowserWindow.fromWebContents(event.sender);
    const opciones = {
      defaultPath: path.join(app.getPath('documents'), copia.nombreSugerido()),
      filters: [{ name: 'Copia de Syntra', extensions: ['syntra'] }],
    };
    const elegido = ventana ? await dialog.showSaveDialog(ventana, opciones) : await dialog.showSaveDialog(opciones);
    if (elegido.canceled || !elegido.filePath) return null;
    return copia.guardarEnArchivo(elegido.filePath, password);
  });

  ipcMain.handle('copiaSeguridad:puedeRestaurarDesdeInicio', () => copia.puedeRestaurarDesdeInicio());
  ipcMain.handle('copiaSeguridad:copiasEnDrive', () => copia.copiasEnDrive());

  // Elegir un archivo .syntra para restaurar. A la pantalla solo le llega el nombre.
  ipcMain.handle('copiaSeguridad:elegirArchivo', async (event) => {
    const ventana = BrowserWindow.fromWebContents(event.sender);
    const opciones = { properties: ['openFile'] as Array<'openFile'>, filters: [{ name: 'Copia de Syntra', extensions: ['syntra'] }] };
    const elegido = ventana ? await dialog.showOpenDialog(ventana, opciones) : await dialog.showOpenDialog(opciones);
    if (elegido.canceled || elegido.filePaths.length === 0) return null;
    archivoElegido = elegido.filePaths[0];
    return { nombre: path.basename(archivoElegido) };
  });

  ipcMain.handle('copiaSeguridad:restaurar', (_event, datos: unknown) => {
    const { origen, password, desdeInicio } = restaurarCopiaSchema.parse(datos);
    if ('archivo' in origen) {
      if (!archivoElegido) throw new Error('Elegí el archivo de la copia.');
      return copia.restaurar({ archivo: archivoElegido }, password, desdeInicio);
    }
    return copia.restaurar(origen, password, desdeInicio);
  });

  // Después de restaurar, Syntra se vuelve a abrir para arrancar con los datos nuevos.
  ipcMain.handle('copiaSeguridad:reiniciar', () => {
    app.relaunch();
    app.exit(0);
  });
}
