import HTMLtoDOCX from '@turbodocx/html-to-docx';
import mammoth from 'mammoth';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Archivos } from '../../administracionDePersistencia/archivos';
import { Nodos } from '../../administracionDePersistencia/nodo';
import { Persistencia } from '../../persistencia/persistencia';
import { Archivo } from '../../logicaPersistente/gestionMaterialEstudio/entidades';

// Carpeta de Material (hija de la raíz) donde se guardan los Word de las sesiones.
const NOMBRE_CARPETA_SESIONES = 'Sesiones de estudio';
const ID_NODO_RAIZ = 1;

// Genera y actualiza el archivo Word de una sesión dentro de Material, reutilizando su módulo.
export class DocumentoSesionEstudio {
  constructor(
    private readonly archivos: Archivos,
    private readonly nodos: Nodos,
    private readonly persistencia: Persistencia
  ) {}

  // Crea el .docx de la sesión en la carpeta "Sesiones de estudio" y devuelve su registro.
  async crear(nombreSesion: string, html: string): Promise<Archivo> {
    const idPadre = await this.obtenerIdCarpeta();
    return this.conTemporal(html, (rutaTmp, tamanio) =>
      this.archivos.crear({
        nombre: this.limpiarNombre(nombreSesion),
        extension: 'docx',
        rutaFisica: rutaTmp,
        tamanio,
        idPadre,
      })
    );
  }

  // Reemplaza el contenido del .docx existente con el HTML actual del editor.
  async actualizar(idArchivo: number, html: string): Promise<Archivo> {
    return this.conTemporal(html, (rutaTmp) => this.archivos.actualizarContenido(idArchivo, rutaTmp));
  }

  // Lee un .docx y lo convierte a HTML (para traer a la sesión lo que se editó afuera, por ejemplo en Drive).
  async leerHtml(rutaCompleta: string): Promise<string> {
    const { value } = await mammoth.convertToHtml({ path: rutaCompleta });
    return value;
  }

  // Busca la carpeta de sesiones bajo la raíz y la crea si no existe.
  private async obtenerIdCarpeta(): Promise<number> {
    const filas = await this.persistencia.ejecutar(
      `SELECT id_nodo FROM nodos WHERE nombre = $1 AND id_padre = $2 LIMIT 1`,
      [NOMBRE_CARPETA_SESIONES, ID_NODO_RAIZ]
    );
    if (filas.length > 0) return filas[0].id_nodo;
    const creada = await this.nodos.crear({ nombre: NOMBRE_CARPETA_SESIONES, idPadre: ID_NODO_RAIZ });
    return creada.id;
  }

  // Convierte el HTML a DOCX, lo deja en un temporal y limpia el temporal al terminar.
  private async conTemporal<T>(html: string, usar: (rutaTmp: string, tamanio: number) => Promise<T>): Promise<T> {
    const docx = (await HTMLtoDOCX(html || '<p></p>', null, {})) as Buffer;
    const carpeta = await mkdtemp(join(tmpdir(), 'sesion-docx-'));
    const ruta = join(carpeta, 'contenido.docx');
    try {
      await writeFile(ruta, docx);
      return await usar(ruta, docx.length);
    } finally {
      await rm(carpeta, { recursive: true, force: true });
    }
  }

  // Quita caracteres no válidos en nombres de archivo y limita el largo.
  private limpiarNombre(nombre: string): string {
    const limpio = nombre.replace(/[\\/:*?"<>|]/g, '-').trim().slice(0, 200);
    return limpio || 'Sesión de estudio';
  }
}
