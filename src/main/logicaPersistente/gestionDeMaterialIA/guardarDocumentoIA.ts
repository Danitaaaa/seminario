// src/main/logicaPersistente/gestionDeMaterialIA/guardarDocumentoIA.ts
// Guarda un documento generado con IA y ya corregido por el usuario (guía de preguntas, resumen) como un .docx
// dentro de Material, en una carpeta propia bajo la raíz que se crea si no existe.
// Misma idea que DocumentoSesionEstudio.crear: HTML → .docx → Archivos.crear.
import HTMLtoDOCX from '@turbodocx/html-to-docx';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Archivos } from '../../administracionDePersistencia/archivos';
import { Nodos } from '../../administracionDePersistencia/nodo';
import { Persistencia } from '../../persistencia/persistencia';
import { Archivo } from '../gestionMaterialEstudio/entidades';

const ID_NODO_RAIZ = 1;

export interface DatosDocumentoIA {
  nombre: string;
  html: string;
}

export class GuardarDocumentoIA {
  constructor(
    private readonly archivos: Archivos,
    private readonly nodos: Nodos,
    private readonly persistencia: Persistencia,
    // Carpeta de Material donde queda (tiene que coincidir con la pantalla que la lista).
    private readonly nombreCarpeta: string,
    // Nombre que se usa si el usuario deja el nombre vacío o solo con caracteres inválidos.
    private readonly nombrePorDefecto: string,
  ) {}

  async ejecutar(datos: DatosDocumentoIA): Promise<Archivo> {
    const idPadre = await this.obtenerIdCarpeta();
    const docx = (await HTMLtoDOCX(datos.html || '<p></p>', null, {})) as Buffer;
    const carpeta = await mkdtemp(join(tmpdir(), 'documento-ia-'));
    const ruta = join(carpeta, 'contenido.docx');
    try {
      await writeFile(ruta, docx);
      return await this.archivos.crear({
        nombre: this.limpiarNombre(datos.nombre),
        extension: 'docx',
        rutaFisica: ruta,
        tamanio: docx.length,
        idPadre,
      });
    } finally {
      await rm(carpeta, { recursive: true, force: true });
    }
  }

  private async obtenerIdCarpeta(): Promise<number> {
    const filas = await this.persistencia.ejecutar(
      `SELECT id_nodo FROM nodos WHERE nombre = $1 AND id_padre = $2 LIMIT 1`,
      [this.nombreCarpeta, ID_NODO_RAIZ],
    );
    if (filas.length > 0) return filas[0].id_nodo;
    const creada = await this.nodos.crear({ nombre: this.nombreCarpeta, idPadre: ID_NODO_RAIZ });
    return creada.id;
  }

  private limpiarNombre(nombre: string): string {
    const limpio = nombre.replace(/[\\/:*?"<>|]/g, '-').trim().slice(0, 200);
    return limpio || this.nombrePorDefecto;
  }
}
