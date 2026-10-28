import { app, ipcMain, dialog, shell } from 'electron';
import HTMLtoDOCX from '@turbodocx/html-to-docx';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
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
} from '../logicaPersistente/gestionMaterialEstudio/dto';
import { Almacenamiento } from '../persistencia/almacenamiento';
import {
  listarAplicaciones,
  abrirConAplicacion,
  elegirOtraAplicacion,
} from '../logicaNoPersistente/abrirCon/aplicacionesSistema';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';


// Carpeta propia de la app donde viven las copias de los archivos subidos.
const CARPETA_MATERIAL = path.join(app.getPath('userData'), 'material');
  // Se llama después de guardar un Word desde el visor (lo usa Sesión de estudio para traer los cambios).
  type AlGuardarDocx = (idArchivo: number, html: string) => Promise<unknown>;

  export function registerArchivosIpc(
  archivos: Archivos, almacenamiento: Almacenamiento, alGuardarDocx?: AlGuardarDocx): void {
  ipcMain.handle('archivos:buscar', async (_event, datos: unknown) => {
    const validado = BuscadorArchivoDTOSchema.parse(datos);
    return archivos.buscar(validado);
  });

  // Devuelve la metadata y los bytes del archivo para visualizarlo en el renderer.
  ipcMain.handle('archivos:leer', async (_event, datos: unknown) => {
    const { id } = ObtenerArchivoDTOSchema.parse(datos);
    const archivo = await archivos.obtener({ id });
    const contenido = await fs.promises.readFile(almacenamiento.rutaCompleta(archivo.rutaFisica));
    return { ...archivo, contenido };
  });


  ipcMain.handle('archivos:crear', async (_event, datos: unknown) => {
    const validado = CrearArchivoDTOSchema.parse(datos);

    // La extensión forma parte del nombre físico: solo alfanumérica, para evitar rutas raras.
    if (!/^[a-zA-Z0-9]+$/.test(validado.extension)) {
      throw new Error('Extensión inválida');
    }

    // Copia el archivo elegido a la carpeta de material de la app; nunca toca el original.
    fs.mkdirSync(CARPETA_MATERIAL, { recursive: true });
    const nombreFisico = `${crypto.randomUUID()}.${validado.extension}`;
    const rutaCopia = path.join(CARPETA_MATERIAL, nombreFisico);
    fs.copyFileSync(validado.rutaFisica, rutaCopia);

    try {
      // El tamaño se toma de la copia real, no de lo que manda el renderer.
      const tamanio = fs.statSync(rutaCopia).size;
      return await archivos.crear({ ...validado, rutaFisica: rutaCopia, tamanio });
    } catch (error) {
      // Si falla el INSERT (por ejemplo nombre duplicado), no dejar la copia huérfana.
      fs.unlink(rutaCopia, () => {});
      throw error;
    }
  });

  ipcMain.handle('archivos:modificar', async (_event, datos: unknown) => {
    const validado = ModificarArchivoDTOSchema.parse(datos);
    return archivos.modificar(validado);
  });

  // Escribe los bytes en un temporal y deja que actualizarContenido haga el reemplazo.
  async function guardarBytes(id: number, bytes: Uint8Array) {
    const carpetaTmp = await mkdtemp(join(tmpdir(), 'guardar-'));
    const rutaTmp = join(carpetaTmp, 'contenido.tmp');
    try {
      await writeFile(rutaTmp, bytes);
      return await archivos.actualizarContenido(id, rutaTmp);
    } finally {
      await rm(carpetaTmp, { recursive: true, force: true });
    }
  }

  // Guarda bytes ya generados por el renderer (PDF, XLSX, TXT).
  ipcMain.handle('archivos:guardar', async (_event, datos: unknown) => {
    const { id, contenido } = GuardarContenidoDTOSchema.parse(datos);
    return guardarBytes(id, contenido);
  });

  // Convierte el HTML del editor a DOCX y lo guarda.
  ipcMain.handle('archivos:guardarDocx', async (_event, datos: unknown) => {
    const { id, html } = GuardarDocxDTOSchema.parse(datos);
    const docx = (await HTMLtoDOCX(html, null, {})) as Buffer;
    const archivo = await guardarBytes(id, docx);
    try {
      await alGuardarDocx?.(id, html);
    } catch (error) {
      console.error('[Archivos] No se pudo actualizar la sesión de estudio del Word:', error);
    }
    return archivo;
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
    const archivo = await archivos.obtener(ObtenerArchivoDTOSchema.parse(datos));
    const error = await shell.openPath(almacenamiento.rutaCompleta(archivo.rutaFisica));
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
    const archivo = await archivos.obtener({ id });
    const aplicacion = (await listarAplicaciones(archivo.extension)).find((a) => a.id === aplicacionId);
    if (!aplicacion) throw new Error('La aplicación elegida no está disponible.');
    await abrirConAplicacion(aplicacion, almacenamiento.rutaCompleta(archivo.rutaFisica));
  });

  // Diálogo nativo de Windows para elegir cualquier otra app; en otros sistemas usa la predeterminada.
  ipcMain.handle('archivos:elegirAplicacion', async (_event, datos: unknown) => {
    const archivo = await archivos.obtener(ObtenerArchivoDTOSchema.parse(datos));
    const ruta = almacenamiento.rutaCompleta(archivo.rutaFisica);
    if (process.platform === 'win32') return elegirOtraAplicacion(ruta);
    const error = await shell.openPath(ruta);
    if (error) throw new Error(error);
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

// Reemplaza el contenido físico escribiendo primero a un temporal, así un fallo no deja el archivo a medias.
function escribirSeguro(ruta: string, contenido: Uint8Array): number {
  const temporal = `${ruta}.tmp`;
  fs.writeFileSync(temporal, contenido);
  fs.renameSync(temporal, ruta);
  return fs.statSync(ruta).size;
}