// Lee los archivos que se adjuntan al Chat con IA (PDF, Word y texto) y devuelve su texto.
// No guarda nada: el texto va con el mensaje y el main lo recuerda mientras la app está abierta.
import fs from 'node:fs';
import path from 'node:path';
import { extraerTexto } from './extractorTexto';
import type { DocumentoChat } from './prompts';

export const EXTENSIONES_ADJUNTO_CHAT = ['pdf', 'docx', 'txt', 'md'];
// Tienen que coincidir con gestionDeChatIA/dto.ts.
export const MAX_TEXTO_ADJUNTO = 30_000; // caracteres por archivo
export const MAX_ARCHIVOS_CARPETA = 10;
const PROFUNDIDAD_CARPETA = 4;
const TAMANIO_MAXIMO_TEXTO = 5 * 1024 * 1024;

const AVISO_RECORTE = '\n[…el archivo sigue, pero se recortó para no superar el límite]';

export interface LecturaAdjuntos {
  documentos: DocumentoChat[];
  avisos: string[]; // archivos que no se pudieron leer o que quedaron afuera
}

function recortar(texto: string): string {
  const limpio = texto.trim();
  return limpio.length <= MAX_TEXTO_ADJUNTO ? limpio : limpio.slice(0, MAX_TEXTO_ADJUNTO - AVISO_RECORTE.length) + AVISO_RECORTE;
}

export const esAdjuntoChat = (extension: string) => EXTENSIONES_ADJUNTO_CHAT.includes(extension.toLowerCase());

// `extension` va aparte porque los archivos de Material se guardan sin la extensión en el nombre físico.
export async function leerDocumento(ruta: string, extension: string, nombre: string): Promise<DocumentoChat> {
  const ext = extension.toLowerCase().replace(/^\./, '');
  if (!esAdjuntoChat(ext)) throw new Error(`"${nombre}" no es PDF, Word ni texto.`);
  let texto: string;
  if (ext === 'txt' || ext === 'md') {
    const { size } = await fs.promises.stat(ruta);
    if (size > TAMANIO_MAXIMO_TEXTO) throw new Error(`"${nombre}" es demasiado grande.`);
    texto = await fs.promises.readFile(ruta, 'utf8');
  } else {
    texto = (await extraerTexto(ruta, ext)).texto;
  }
  if (!texto.trim()) throw new Error(`"${nombre}" no tiene texto.`);
  return { nombre, texto: recortar(texto) };
}

// Varios archivos elegidos de la compu: los que fallan se avisan y el resto se adjunta igual.
export async function leerArchivos(rutas: string[]): Promise<LecturaAdjuntos> {
  const documentos: DocumentoChat[] = [];
  const avisos: string[] = [];
  for (const ruta of rutas) {
    const nombre = path.basename(ruta);
    try {
      documentos.push(await leerDocumento(ruta, path.extname(ruta), nombre));
    } catch (e) {
      avisos.push(e instanceof Error ? e.message : `No se pudo leer "${nombre}".`);
    }
  }
  return { documentos, avisos };
}

// Una carpeta de la compu: se buscan PDF, Word y texto adentro (también en subcarpetas).
export async function leerCarpeta(carpeta: string): Promise<LecturaAdjuntos> {
  const encontrados: string[] = [];
  async function recorrer(dir: string, nivel: number): Promise<void> {
    const entradas = await fs.promises.readdir(dir, { withFileTypes: true });
    entradas.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    for (const e of entradas) {
      if (e.name.startsWith('.') || e.name.startsWith('~$')) continue;
      const ruta = path.join(dir, e.name);
      if (e.isDirectory() && nivel < PROFUNDIDAD_CARPETA) await recorrer(ruta, nivel + 1);
      else if (e.isFile() && esAdjuntoChat(path.extname(e.name).slice(1))) encontrados.push(ruta);
    }
  }
  await recorrer(carpeta, 0);

  if (encontrados.length === 0) return { documentos: [], avisos: ['La carpeta no tiene archivos PDF, Word ni de texto.'] };
  const lectura = await leerArchivos(encontrados.slice(0, MAX_ARCHIVOS_CARPETA));
  if (encontrados.length > MAX_ARCHIVOS_CARPETA) {
    lectura.avisos.push(`La carpeta tiene ${encontrados.length} archivos: se adjuntaron los primeros ${MAX_ARCHIVOS_CARPETA}.`);
  }
  return lectura;
}
