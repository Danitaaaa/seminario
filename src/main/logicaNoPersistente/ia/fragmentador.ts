// Fragmentador: corta el texto por títulos y, si una sección sigue siendo muy grande,
// por párrafos → oraciones → corte duro. Así ningún pedido a la IA supera el límite
// de tokens aunque el archivo sea pesado.

export interface Fragmento {
  indice: number;
  /** Título de la sección de donde sale (si se detectó). */
  titulo?: string;
  texto: string;
  tokensAprox: number;
}

export interface OpcionesFragmentador {
  /** Tamaño máximo por fragmento. Gemma local aguanta menos: usar ~2000. */
  maxTokens?: number;
  /** Tokens del final del fragmento anterior que se repiten al inicio del siguiente (contexto). */
  solapamientoTokens?: number;
}

/** Estimación simple: ~4 caracteres por token (sirve para español). */
export const estimarTokens = (t: string) => Math.ceil(t.length / 4);

const REGEX_TITULO_MD = /^(#{1,6})\s+(.+)$/;
// Para PDF (no trae marcas): "1. Introducción", "2.3 Métodos", "CAPÍTULO II", "UNIDAD 3: ..."
const REGEX_TITULO_PDF = /^((\d+(\.\d+)*\.?)\s+\p{Lu}.{0,80}|[\p{Lu}\d][\p{Lu}\d\s:.,-]{3,80})$/u;

interface Seccion {
  titulo?: string;
  texto: string;
}

export function fragmentar(texto: string, opciones: OpcionesFragmentador = {}): Fragmento[] {
  const maxTokens = opciones.maxTokens ?? 3000;
  const solape = opciones.solapamientoTokens ?? 150;
  const maxChars = maxTokens * 4;

  const secciones = dividirPorTitulos(texto);
  const bloques: Seccion[] = [];

  // 1) Secciones grandes → se parten. 2) Secciones chicas seguidas → se agrupan.
  // Objeto (no `let`) para que TS no estreche el tipo a `null` dentro del bucle.
  const estado: { acumulado: Seccion | null } = { acumulado: null };
  const volcar = () => {
    if (estado.acumulado?.texto.trim()) bloques.push(estado.acumulado);
    estado.acumulado = null;
  };

  for (const s of secciones) {
    const conTitulo = s.titulo ? `${s.titulo}\n${s.texto}` : s.texto;
    if (conTitulo.length > maxChars) {
      volcar();
      const partes = partirTexto(s.texto, maxChars - (s.titulo?.length ?? 0) - 1);
      partes.forEach((p, i) => {
        const textoParte = i > 0 && solape > 0 ? `${cola(partes[i - 1], solape * 4)}\n${p}` : p;
        bloques.push({ titulo: s.titulo, texto: s.titulo ? `${s.titulo}\n${textoParte}` : textoParte });
      });
    } else if (estado.acumulado && estado.acumulado.texto.length + conTitulo.length + 2 <= maxChars) {
      estado.acumulado.texto += `\n\n${conTitulo}`;
    } else {
      volcar();
      estado.acumulado = { titulo: s.titulo, texto: conTitulo };
    }
  }
  volcar();

  return bloques.map((b, indice) => ({
    indice,
    titulo: b.titulo,
    texto: b.texto.trim(),
    tokensAprox: estimarTokens(b.texto),
  }));
}

// Solo los textos, con un máximo en caracteres y sin solapamiento (lo usa ia:generar).
export function fragmentarEnTextos(texto: string, maxCaracteres = 12_000): string[] {
  const maxTokens = Math.max(1, Math.floor(maxCaracteres / 4)); // ~4 caracteres por token
  return fragmentar(texto, { maxTokens, solapamientoTokens: 0 }).map((f) => f.texto);
}

function dividirPorTitulos(texto: string): Seccion[] {
  const secciones: Seccion[] = [];
  let actual: Seccion = { texto: '' };

  for (const linea of texto.split('\n')) {
    const md = linea.match(REGEX_TITULO_MD);
    const esTituloPdf = !md && linea.length <= 90 && !/[.;:,]$/.test(linea) && REGEX_TITULO_PDF.test(linea.trim());
    if (md || esTituloPdf) {
      if (actual.texto.trim() || actual.titulo) secciones.push(actual);
      actual = { titulo: (md ? md[2] : linea).trim(), texto: '' };
    } else {
      actual.texto += `${linea}\n`;
    }
  }
  if (actual.texto.trim() || actual.titulo) secciones.push(actual);
  return secciones;
}

/** Parte por párrafos; si un párrafo no entra, por oraciones; si una oración no entra, corte duro. */
function partirTexto(texto: string, maxChars: number): string[] {
  const unidades = texto
    .split(/\n{2,}/)
    .flatMap((p) => (p.length <= maxChars ? [p] : p.split(/(?<=[.!?…])\s+/)))
    .flatMap((o) => (o.length <= maxChars ? [o] : cortarDuro(o, maxChars)));

  const partes: string[] = [];
  let actual = '';
  for (const u of unidades) {
    if (actual && actual.length + u.length + 2 > maxChars) {
      partes.push(actual);
      actual = u;
    } else {
      actual = actual ? `${actual}\n\n${u}` : u;
    }
  }
  if (actual.trim()) partes.push(actual);
  return partes;
}

function cortarDuro(t: string, max: number): string[] {
  const r: string[] = [];
  for (let i = 0; i < t.length; i += max) r.push(t.slice(i, i + max));
  return r;
}

/** Últimos `chars` caracteres, empezando en un límite de palabra. */
function cola(t: string, chars: number): string {
  if (t.length <= chars) return t;
  const recorte = t.slice(-chars);
  const espacio = recorte.indexOf(' ');
  return `…${espacio >= 0 ? recorte.slice(espacio + 1) : recorte}`;
}
