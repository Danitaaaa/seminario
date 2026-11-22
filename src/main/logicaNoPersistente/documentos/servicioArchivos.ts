import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import HTMLtoDOCX from '@turbodocx/html-to-docx';
import type { Archivos } from '../../administracionDePersistencia/archivos';
import type { Nodos } from '../../administracionDePersistencia/nodo';
import type { Archivo } from '../../logicaPersistente/gestionMaterialEstudio/entidades';
import { ListarContenidoDTOSchema, type CrearArchivoDTO } from '../../logicaPersistente/gestionMaterialEstudio/dto';
import type { Almacenamiento } from '../../persistencia/almacenamiento';
import { importarRutas, nombreLibre, type DestinoImportacion } from '../importarMaterial/importarRutas';
import { copiarACarpeta, copiarUno, nombreSeguro } from '../descargas/copiarArchivos';
import { documentoVacio } from './documentoVacio';

// Se llama después de guardar un Word desde el visor (lo usa Sesión de estudio para traer los cambios).
export type AlGuardarDocx = (idArchivo: number, html: string) => Promise<unknown>;

// Lo que pasa con los archivos de Material en el disco: copias, temporales, conversión a Word y descargas.
// No toca la base: para guardar el registro usa las fachadas (Archivos y Nodos), con sus permisos de siempre.
// El IPC solo valida los datos y llama acá; los cuadros de diálogo de Electron se quedan en el IPC.
export class ServicioArchivos {
  // Para subir carpetas: crea subcarpetas y archivos con las mismas fachadas (y permisos) de siempre.
  readonly destino: DestinoImportacion;

  constructor(
    private readonly archivos: Archivos,
    private readonly nodos: Nodos,
    private readonly almacenamiento: Almacenamiento,
    private readonly carpetaMaterial: string, // carpeta propia de la app con las copias de los archivos subidos
    private readonly alGuardarDocx?: AlGuardarDocx,
  ) {
    this.destino = {
      nombresEn: async (idPadre) => {
        const lista = await this.nodos.listar(ListarContenidoDTOSchema.parse({ idPadre }));
        return new Set(lista.map((n) => (n.tipo === 'carpeta' ? n.nombre : `${n.nombre}.${n.extension}`).normalize('NFC').toLowerCase()));
      },
      // NFC: los nombres con tildes "separadas" (de Mac o de Drive) no entran en la base si está en WIN1252.
      crearCarpeta: async (nombre, idPadre) => (await this.nodos.crear({ nombre: nombre.normalize('NFC'), idPadre })).id,
      crearArchivo: async (rutaFisica, nombre, extension, idPadre) => {
        await this.crear({ nombre: nombre.normalize('NFC'), extension, rutaFisica, idPadre });
      },
    };
  }

  // Copia el archivo elegido a la carpeta de material de la app (nunca toca el original) y lo registra.
  async crear(datos: CrearArchivoDTO): Promise<Archivo> {
    // La extensión forma parte del nombre físico: solo alfanumérica, para evitar rutas raras.
    if (!/^[a-zA-Z0-9]+$/.test(datos.extension)) {
      throw new Error('Extensión inválida');
    }

    fs.mkdirSync(this.carpetaMaterial, { recursive: true });
    const rutaCopia = path.join(this.carpetaMaterial, `${crypto.randomUUID()}.${datos.extension}`);
    fs.copyFileSync(datos.rutaFisica, rutaCopia);

    try {
      // El tamaño se toma de la copia real, no de lo que manda el renderer.
      const tamanio = fs.statSync(rutaCopia).size;
      return await this.archivos.crear({ ...datos, rutaFisica: rutaCopia, tamanio });
    } catch (error) {
      // Si falla el INSERT (por ejemplo nombre duplicado), no dejar la copia huérfana.
      fs.unlink(rutaCopia, () => {});
      throw error;
    }
  }

  // Sube carpetas y archivos con todo lo que tienen adentro (elegidos o arrastrados desde el explorador).
  importar(rutas: string[], idPadre: number) {
    return importarRutas(rutas, idPadre, this.destino);
  }

  // Metadata y bytes del archivo, para mostrarlo en el visor.
  async leer(id: number): Promise<Archivo & { contenido: Buffer }> {
    const archivo = await this.archivos.obtener({ id });
    const contenido = await fs.promises.readFile(this.almacenamiento.rutaCompleta(archivo.rutaFisica));
    return { ...archivo, contenido };
  }

  // Ruta completa en el disco (para abrirlo con otra aplicación). Nunca se manda al renderer.
  async rutaDe(id: number): Promise<{ archivo: Archivo; ruta: string }> {
    const archivo = await this.archivos.obtener({ id });
    return { archivo, ruta: this.almacenamiento.rutaCompleta(archivo.rutaFisica) };
  }

  // Escribe los bytes en un temporal y deja que actualizarContenido haga el reemplazo.
  async guardarBytes(id: number, bytes: Uint8Array): Promise<Archivo> {
    const carpetaTmp = await mkdtemp(path.join(tmpdir(), 'guardar-'));
    const rutaTmp = path.join(carpetaTmp, 'contenido.tmp');
    try {
      await writeFile(rutaTmp, bytes);
      return await this.archivos.actualizarContenido(id, rutaTmp);
    } finally {
      await rm(carpetaTmp, { recursive: true, force: true });
    }
  }

  // Convierte el HTML del editor a Word y lo guarda. Las líneas (<hr>) del editor son los saltos de página.
  async guardarDocx(id: number, html: string): Promise<Archivo> {
    const conSaltos = html.replace(/<hr\s*\/?>/gi, '<div class="page-break"></div>');
    const docx = (await HTMLtoDOCX(conSaltos, null, {})) as Buffer;
    const archivo = await this.guardarBytes(id, docx);
    try {
      await this.alGuardarDocx?.(id, html);
    } catch (error) {
      console.error('[Archivos] No se pudo actualizar la sesión de estudio del Word:', error);
    }
    return archivo;
  }

  // Documento nuevo y vacío en la carpeta (Word o texto). Si el nombre ya existe, le suma "(2)".
  // Pasa por la misma fachada que subir un archivo: mismos permisos y la misma sincronización en proyectos.
  async crearDocumento(idPadre: number, nombre: string, tipo: 'docx' | 'txt'): Promise<Archivo> {
    const libre = nombreLibre(nombre.normalize('NFC'), tipo, await this.destino.nombresEn(idPadre));
    const carpetaTmp = await mkdtemp(path.join(tmpdir(), 'nuevo-'));
    const rutaTmp = path.join(carpetaTmp, `nuevo.${tipo}`);
    try {
      await writeFile(rutaTmp, await documentoVacio(tipo));
      return await this.crear({ nombre: libre, extension: tipo, rutaFisica: rutaTmp, idPadre });
    } finally {
      await rm(carpetaTmp, { recursive: true, force: true });
    }
  }

  // Nombre con el que se ofrece guardar un archivo al descargarlo (sin caracteres que Windows no acepta).
  nombreDescarga(archivo: Archivo): string {
    return `${nombreSeguro(archivo.nombre)}.${archivo.extension}`;
  }

  // Descarga un archivo en la ruta que eligió la persona.
  async descargarUno(archivo: Archivo, destino: string) {
    await copiarUno(this.almacenamiento.rutaCompleta(archivo.rutaFisica), destino);
    return { copiados: 1, fallidos: 0, destino: path.basename(destino) };
  }

  // Descarga varios archivos en una carpeta, sin pisar los que ya están.
  async descargarVarios(lista: Archivo[], carpeta: string) {
    const resultado = await copiarACarpeta(
      carpeta,
      lista.map((a) => ({ origen: this.almacenamiento.rutaCompleta(a.rutaFisica), nombre: a.nombre, extension: a.extension })),
    );
    return { ...resultado, destino: path.basename(carpeta) };
  }

  // Datos del archivo que se eligió en el explorador, antes de subirlo.
  describir(rutaFisica: string) {
    const extension = path.extname(rutaFisica).replace('.', '');
    const nombre = path.basename(rutaFisica, path.extname(rutaFisica)).normalize('NFC');
    return { nombre, extension, rutaFisica, tamanio: fs.statSync(rutaFisica).size };
  }
}
