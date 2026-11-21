// Las bases que creó la app instalada en Windows quedaron en WIN1252: ahí no entran
// caracteres como los símbolos de fuentes de PDF, letras griegas o emojis, y el INSERT falla.
// Para esas bases, los textos se adaptan antes de guardarlos.
// Además, PostgreSQL no acepta el carácter nulo (\u0000) en ninguna base, y algunos PDF lo traen.

// Caracteres de WIN1252 entre 0x80 y 0x9F (el resto coincide con Unicode).
const EXTRA_WIN1252 = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');

const REEMPLAZOS: Record<string, string> = {
  '→': '->', '←': '<-', '⇒': '=>', '↔': '<->', '≤': '<=', '≥': '>=', '≠': '!=', '≈': '~',
  '−': '-', '∙': '·', '✓': '✔', '★': '*', '☆': '*',
};

const entraEnWin1252 = (c: string) => {
  const cp = c.codePointAt(0)!;
  return cp < 0x80 || (cp >= 0xa0 && cp <= 0xff) || EXTRA_WIN1252.has(c);
};

export function aWin1252(texto: string): string {
  let salida = '';
  for (const c of texto.normalize('NFC')) {
    if (c === '\u0000') continue;
    if (entraEnWin1252(c)) { salida += c; continue; }
    const reemplazo = REEMPLAZOS[c];
    if (reemplazo !== undefined && [...reemplazo].every(entraEnWin1252)) { salida += reemplazo; continue; }
    // Ligaduras, superíndices, letras de ancho completo…: su forma simple suele entrar.
    const simple = c.normalize('NFKC');
    if (simple !== c && [...simple].every(entraEnWin1252)) { salida += simple; continue; }
    const cp = c.codePointAt(0)!;
    // Símbolos de fuentes de PDF (uso privado) y marcas invisibles: se sacan.
    if ((cp >= 0xe000 && cp <= 0xf8ff) || (cp >= 0xf0000) || (cp >= 0x200b && cp <= 0x200f) || cp === 0xfeff) continue;
    salida += '?';
  }
  return salida;
}

// Recorre los valores de una consulta (también arrays y objetos que se guardan como JSON).
export function adaptarValores(valor: unknown, utf8: boolean): unknown {
  if (typeof valor === 'string') return utf8 ? valor.replaceAll('\u0000', '') : aWin1252(valor);
  if (Array.isArray(valor)) return valor.map((v) => adaptarValores(v, utf8));
  if (valor && typeof valor === 'object' && Object.getPrototypeOf(valor) === Object.prototype) {
    return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, adaptarValores(v, utf8)]));
  }
  return valor;
}
