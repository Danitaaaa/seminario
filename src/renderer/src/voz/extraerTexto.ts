import mammoth from 'mammoth';
import { pdfjs } from 'react-pdf';
import type { Bloque } from './lectorDocumento';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

function bloquesDeTexto(texto: string): Bloque[] {
  return texto
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter(Boolean)
    .map((linea) => ({ texto: linea.replace(/^#+\s*/, ''), esTitulo: /^#+\s/.test(linea) }));
}

function bloquesDeHtml(html: string): Bloque[] {
  const documento = new DOMParser().parseFromString(html, 'text/html');
  return [...documento.body.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li')].map((el) => ({
    texto: el.textContent?.trim() ?? '',
    esTitulo: /^H\d$/.test(el.tagName),
  }));
}

// Cada página del PDF es un "título", así "siguiente título" salta de página.
async function bloquesDePdf(bytes: Uint8Array): Promise<Bloque[]> {
  const pdf = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  const bloques: Bloque[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const { items } = await (await pdf.getPage(n)).getTextContent();
    const texto = items.map((i) => ('str' in i ? i.str : '')).join(' ').replace(/\s+/g, ' ').trim();
    bloques.push({ texto: `Página ${n}`, esTitulo: true }, { texto, esTitulo: false });
  }
  return bloques;
}

export async function extraerBloques(contenido: Uint8Array, extension: string): Promise<Bloque[]> {
  switch (extension.toLowerCase()) {
    case 'pdf':
      return bloquesDePdf(contenido);
    case 'docx': {
      const buffer = contenido.buffer.slice(contenido.byteOffset, contenido.byteOffset + contenido.byteLength) as ArrayBuffer;
      return bloquesDeHtml((await mammoth.convertToHtml({ arrayBuffer: buffer })).value);
    }
    case 'txt':
    case 'md':
      return bloquesDeTexto(new TextDecoder().decode(contenido));
    default:
      return [];
  }
}