import { app, ipcMain, dialog, shell, BrowserWindow } from 'electron';
import path from 'node:path';
import { Archivos } from '../administracionDePersistencia/archivos';
import {
  CrearArchivoDTOSchema,
  BuscadorArchivoDTOSchema,
  ModificarArchivoDTOSchema,
  EliminarArchivoDTOSchema,
  MoverArchivosDTOSchema,
  ObtenerArchivoDTOSchema,
  GuardarContenidoDTOSchema,
  GuardarDocxDTOSchema,
  AbrirConAplicacionDTOSchema,
  ImportarRutasDTOSchema,
  SubirCarpetaDTOSchema,
  DescargarArchivosDTOSchema,
  CrearDocumentoDTOSchema,
} from '../logicaPersistente/gestionMaterialEstudio/dto';
import { ServicioArchivos } from '../logicaNoPersistente/documentos/servicioArchivos';
import {
  listarAplicaciones,
  abrirConAplicacion,
  elegirOtraAplicacion,
} from '../logicaNoPersistente/abrirCon/aplicacionesSistema';

// Handlers IPC de archivos: validan los datos con Zod y llaman a la fachada (Archivos) o a ServicioArchivos,
// que es donde está lo que pasa en el disco. Acá solo quedan los cuadros de diálogo de Electron.
export function registerArchivosIpc(archivos: Archivos, servicio: ServicioArchivos): void {
  ipcMain.handle('archivos:buscar', async (_event, datos: unknown) => {
    const validado = BuscadorArchivoDTOSchema.parse(datos);
    return archivos.buscar(validado);
  });

  // Devuelve la metadata y los bytes del archivo para visualizarlo en el renderer.
  ipcMain.handle('archivos:leer', async (_event, datos: unknown) => {
    const { id } = ObtenerArchivoDTOSchema.parse(datos);
    return servicio.leer(id);
  });

  ipcMain.handle('archivos:crear', async (_event, datos: unknown) => {
    return servicio.crear(CrearArchivoDTOSchema.parse(datos));
  });

  // Abre el selector de carpetas del SO y sube las elegidas con todo lo que tienen adentro.
  ipcMain.handle('archivos:subirCarpeta', async (_event, datos: unknown) => {
    const { idPadre } = SubirCarpetaDTOSchema.parse(datos);
    const resultado = await dialog.showOpenDialog({ properties: ['openDirectory', 'multiSelections'] });
    if (resultado.canceled || resultado.filePaths.length === 0) return null;
    return servicio.importar(resultado.filePaths, idPadre);
  });

  // Carpetas y archivos arrastrados desde el explorador.
  ipcMain.handle('archivos:importar', async (_event, datos: unknown) => {
    const { idPadre, rutas } = ImportarRutasDTOSchema.parse(datos);
    return servicio.importar(rutas, idPadre);
  });

  ipcMain.handle('archivos:modificar', async (_event, datos: unknown) => {
    const validado = ModificarArchivoDTOSchema.parse(datos);
    return archivos.modificar(validado);
  });

  // Guarda bytes ya generados por el renderer (PDF, XLSX, TXT).
  ipcMain.handle('archivos:guardar', async (_event, datos: unknown) => {
    const { id, contenido } = GuardarContenidoDTOSchema.parse(datos);
    return servicio.guardarBytes(id, contenido);
  });

  // Convierte el HTML del editor a DOCX y lo guarda.
  ipcMain.handle('archivos:guardarDocx', async (_event, datos: unknown) => {
    const { id, html } = GuardarDocxDTOSchema.parse(datos);
    return servicio.guardarDocx(id, html);
  });

  ipcMain.handle('archivos:mover', async (_event, datos: unknown) => {
    const validado = MoverArchivosDTOSchema.parse(datos);
    return archivos.mover(validado);
  });

  ipcMain.handle('archivos:eliminar', async (_event, datos: unknown) => {
    const validado = EliminarArchivoDTOSchema.parse(datos);
    return archivos.eliminar(validado);
  });

  // Abre el archivo con la aplicación predeterminada del sistema operativo.
  ipcMain.handle('archivos:abrirExterno', async (_event, datos: unknown) => {
    const { ruta } = await servicio.rutaDe(ObtenerArchivoDTOSchema.parse(datos).id);
    const error = await shell.openPath(ruta);
    if (error) throw new Error(error);
  });

  // Apps del sistema que pueden abrir el archivo. Al renderer solo le llegan id y nombre, nunca rutas.
  ipcMain.handle('archivos:aplicacionesDisponibles', async (_event, datos: unknown) => {
    const archivo = await archivos.obtener(ObtenerArchivoDTOSchema.parse(datos));
    const aplicaciones = await listarAplicaciones(archivo.extension);
    return aplicaciones.map(({ id, nombre }) => ({ id, nombre }));
  });

  // La app se vuelve a buscar acá: el renderer solo puede elegir entre las que listó el main.
  ipcMain.handle('archivos:abrirConAplicacion', async (_event, datos: unknown) => {
    const { id, aplicacionId } = AbrirConAplicacionDTOSchema.parse(datos);
    const { archivo, ruta } = await servicio.rutaDe(id);
    const aplicacion = (await listarAplicaciones(archivo.extension)).find((a) => a.id === aplicacionId);
    if (!aplicacion) throw new Error('La aplicación elegida no está disponible.');
    await abrirConAplicacion(aplicacion, ruta);
  });

  // Diálogo nativo de Windows para elegir cualquier otra app; en otros sistemas usa la predeterminada.
  ipcMain.handle('archivos:elegirAplicacion', async (_event, datos: unknown) => {
    const { ruta } = await servicio.rutaDe(ObtenerArchivoDTOSchema.parse(datos).id);
    if (process.platform === 'win32') return elegirOtraAplicacion(ruta);
    const error = await shell.openPath(ruta);
    if (error) throw new Error(error);
  });

  // Descarga: con un archivo pregunta dónde guardarlo (con su nombre original); con varios, en qué carpeta.
  // Devuelve null si el usuario canceló.
  ipcMain.handle('archivos:descargar', async (event, datos: unknown) => {
    const { ids } = DescargarArchivosDTOSchema.parse(datos);
    const lista = await Promise.all(ids.map((id) => archivos.obtener({ id })));
    const ventana = BrowserWindow.fromWebContents(event.sender);
    const descargas = app.getPath('downloads');

    if (lista.length === 1) {
      const [archivo] = lista;
      const opciones = {
        defaultPath: path.join(descargas, servicio.nombreDescarga(archivo)),
        filters: [{ name: archivo.extension.toUpperCase(), extensions: [archivo.extension] }],
      };
      const elegido = ventana ? await dialog.showSaveDialog(ventana, opciones) : await dialog.showSaveDialog(opciones);
      if (elegido.canceled || !elegido.filePath) return null;
      return servicio.descargarUno(archivo, elegido.filePath);
    }

    const opciones = {
      title: `Descargar ${lista.length} archivos`,
      defaultPath: descargas,
      buttonLabel: 'Descargar acá',
      properties: ['openDirectory', 'createDirectory'] as Array<'openDirectory' | 'createDirectory'>,
    };
    const elegido = ventana ? await dialog.showOpenDialog(ventana, opciones) : await dialog.showOpenDialog(opciones);
    if (elegido.canceled || elegido.filePaths.length === 0) return null;
    return servicio.descargarVarios(lista, elegido.filePaths[0]);
  });

  // Documento nuevo y vacío en la carpeta (Word o texto).
  ipcMain.handle('archivos:crearDocumento', async (_event, datos: unknown) => {
    const { idPadre, nombre, tipo } = CrearDocumentoDTOSchema.parse(datos);
    return servicio.crearDocumento(idPadre, nombre, tipo);
  });

  // Abre el selector de archivos del SO y devuelve la metadata básica del elegido.
  ipcMain.handle('archivos:seleccionar', async () => {
    const resultado = await dialog.showOpenDialog({ properties: ['openFile'] });
    if (resultado.canceled || resultado.filePaths.length === 0) return null;
    return servicio.describir(resultado.filePaths[0]);
  });
}
