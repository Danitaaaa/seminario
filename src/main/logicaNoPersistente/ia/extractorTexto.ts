import fs from 'node:fs';
import mammoth from 'mammoth';
import { esFuenteIA, type ExtensionFuenteIA } from './tipos';

const TAMANIO_MAXIMO = 50 * 1024 * 1024; // 50 MB

export type CodigoErrorExtraccion = 'TIPO_NO_SOPORTADO' | 'ARCHIVO_GRANDE' | 'SIN_TEXTO' | 'ARCHIVO_DANIADO';

export class ErrorExtraccion extends Error {
  constructor(mensaje: string, readonly codigo: CodigoErrorExtraccion) {
    super(mensaje);
    this.name = 'ErrorExtraccion';
  }
}

export interface TextoExtraido {
  extension: ExtensionFuenteIA;
  // Normalizado. Los títulos detectados vienen como "# ", "## "... para que el fragmentador corte ahí.
  texto: string;
  paginas?: number;
}

// Lee un PDF o DOCX del almacenamiento y devuelve su texto.
export async function extraerTexto(ruta: string, extension: string): Promise<TextoExtraido> {
  const ext = extension.toLowerCase();
  if (!esFuenteIA(ext)) throw new ErrorExtraccion('Solo se puede usar la IA con archivos PDF y DOCX.', 'TIPO_NO_SOPORTADO');

  const { size } = await fs.promises.stat(ruta);
  if (size > TAMANIO_MAXIMO) throw new ErrorExtraccion('El archivo supera los 50 MB.', 'ARCHIVO_GRANDE');

  const buffer = await fs.promises.readFile(ruta);
  let texto: string;
  let paginas: number | undefined;
  try {
    if (ext === 'docx') {
      // convertToHtml conserva los títulos (h1, h2...); extractRawText los pierde.
      const { value: html } = await mammoth.convertToHtml({ buffer });
      texto = htmlATexto(html);
    } else {
      ({ texto, paginas } = await textoDePdf(buffer));
    }
  } catch (error) {
    throw new ErrorExtraccion(`No se pudo leer el archivo: ${(error as Error).message}`, 'ARCHIVO_DANIADO');
  }

  texto = normalizar(texto);
  if (texto.replace(/\s/g, '').length < 50) {
    throw new ErrorExtraccion('El archivo no tiene texto seleccionable (¿es un PDF escaneado?).', 'SIN_TEXTO');
  }
  return { extension: ext, texto, paginas };
}

// pdfjs-dist ya viene con react-pdf. Se importa dinámicamente porque es un módulo ESM.
async function textoDePdf(buffer: Buffer): Promise<{ texto: string; paginas: number }> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const carga = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  });

  try {
    const documento = await carga.promise;
    const paginas: string[] = [];
    for (let n = 1; n <= documento.numPages; n++) {
      const pagina = await documento.getPage(n);
      const { items } = await pagina.getTextContent();
      // hasEOL marca el fin de renglón; sin eso todo el texto de la página queda en una línea.
      paginas.push(items.map((i) => ('str' in i ? i.str + (i.hasEOL ? '\n' : '') : '')).join(''));
      pagina.cleanup();
    }
    return { texto: paginas.join('\n\n'), paginas: documento.numPages };
  } finally {
    await carga.destroy();
  }
}

// HTML de mammoth → texto con títulos al estilo markdown.
function htmlATexto(html: string): string {
  return decodificarEntidades(
    html
      .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, n: string, t: string) => `\n\n${'#'.repeat(Number(n))} ${t}\n\n`)
      .replace(/<li[^>]*>/gi, '\n- ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|tr|table|ul|ol)>/gi, '\n\n')
      .replace(/<\/t[dh]>/gi, ' | ')
      .replace(/<[^>]+>/g, ''),
  );
}

function decodificarEntidades(texto: string): string {
  return texto
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_m, c: string) => String.fromCodePoint(Number(c)))
    .replace(/&amp;/g, '&');
}

function normalizar(texto: string): string {
  return texto
    .replace(/\r\n?/g, '\n')
    .replace(/­/g, '') // guion blando
    .replace(/(\p{L})-\n(\p{Ll})/gu, '$1$2') // "pala-\nbra" → "palabra" (cortes de renglón del PDF)
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
