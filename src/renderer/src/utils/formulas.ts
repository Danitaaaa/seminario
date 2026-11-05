import type { ClipboardEvent } from 'react';

// Largo máximo de una flashcard (el mismo que valida el main).
export const LARGO_PREGUNTA = 250;
export const LARGO_RESPUESTA = 2000;

// Fórmulas en texto: se escriben en LaTeX entre $…$ (en línea) o $$…$$ (en su propio renglón).
// También se aceptan \( … \) y \[ … \], que es como las copia ChatGPT.

export interface Trozo {
  tipo: 'texto' | 'formula';
  contenido: string;
  bloque?: boolean;
}

// $$…$$ y \[…\] van primero para que no los confunda con $…$.
const PATRON = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^$\n]+?)\$/g;

// Separa el texto en partes comunes y fórmulas.
export function separarFormulas(texto: string): Trozo[] {
  const trozos: Trozo[] = [];
  let desde = 0;
  for (const coincidencia of texto.matchAll(PATRON)) {
    const inicio = coincidencia.index ?? 0;
    if (inicio > desde) trozos.push({ tipo: 'texto', contenido: texto.slice(desde, inicio) });
    const [, bloqueDolar, bloqueCorchete, enLineaParentesis, enLineaDolar] = coincidencia;
    const bloque = bloqueDolar ?? bloqueCorchete;
    trozos.push({ tipo: 'formula', contenido: (bloque ?? enLineaParentesis ?? enLineaDolar).trim(), bloque: bloque !== undefined });
    desde = inicio + coincidencia[0].length;
  }
  if (desde < texto.length) trozos.push({ tipo: 'texto', contenido: texto.slice(desde) });
  return trozos;
}

export const tieneFormulas = (texto: string) => separarFormulas(texto).some((t) => t.tipo === 'formula');

// Al pegar una fórmula de una página (ChatGPT, Wikipedia, apuntes con KaTeX o MathJax, Word),
// el texto plano sale roto ("x2+1x^2+1"). En el HTML copiado viene el LaTeX original o el MathML:
// se reemplaza cada fórmula por su LaTeX entre $…$. Devuelve null si lo copiado no trae fórmulas.
export function textoPegadoConFormulas(html: string): string | null {
  if (!html || !/<math|katex|MathJax|data-math|\b(mord|mfrac|msupsub)\b/i.test(html)) return null;
  const documento = new DOMParser().parseFromString(html, 'text/html');
  let encontradas = 0;

  // Gemini guarda el LaTeX en data-math; KaTeX y MathJax, en una anotación dentro del MathML.
  const nodos = documento.querySelectorAll('[data-math], .katex-display, .katex, mjx-container, math');
  nodos.forEach((nodo) => {
    if (!nodo.isConnected) return; // ya se reemplazó al procesar la fórmula que lo contiene
    const tex = nodo.getAttribute('data-math')?.trim()
      || (nodo.querySelector('annotation[encoding="application/x-tex"]')?.textContent?.trim()
      ?? nodo.getAttribute('alttext')?.trim()
      ?? nodo.querySelector('math')?.getAttribute('alttext')?.trim());
    const enBloque = nodo.classList.contains('katex-display') || nodo.classList.contains('math-block')
      || nodo.getAttribute('display') === 'block';
    const reemplazo = tex ? (enBloque ? `$$${tex}$$` : `$${tex}$`) : textoDeMathML(nodo);
    nodo.replaceWith(documento.createTextNode(reemplazo));
    encontradas++;
  });

  encontradas += reemplazarKatexSuelto(documento);
  if (encontradas === 0) return null;
  // innerText respeta los saltos de línea de párrafos y <br>; textContent no.
  const cuerpo = documento.body;
  return (cuerpo.innerText || cuerpo.textContent || '').replace(/\u00a0/g, ' ').trim();
}

// Si se selecciona solo la fórmula (por ejemplo en Gemini), lo copiado trae únicamente el HTML que
// dibuja KaTeX, sin el LaTeX ni el MathML. Se rearma el LaTeX a partir de ese HTML.
const CLASES_KATEX = ['base', 'mord', 'mrel', 'mbin', 'mop', 'mopen', 'mclose', 'mpunct', 'minner', 'mfrac', 'msupsub', 'sqrt'];
const esKatex = (el: Element) => CLASES_KATEX.some((c) => el.classList.contains(c));

function reemplazarKatexSuelto(documento: Document): number {
  // Solo las piezas de más afuera; las de adentro se leen al convertir la de afuera.
  const piezas = [...documento.body.querySelectorAll('span')].filter(
    (el) => esKatex(el) && !(el.parentElement && el.parentElement.closest(CLASES_KATEX.map((c) => `.${c}`).join(',')))
  );
  // Las piezas seguidas (hermanas) forman una sola fórmula.
  const grupos: Element[][] = [];
  for (const pieza of piezas) {
    let anterior = pieza.previousSibling;
    while (anterior && anterior.nodeType === Node.TEXT_NODE && !anterior.textContent?.trim()) anterior = anterior.previousSibling;
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && anterior === ultimo[ultimo.length - 1]) ultimo.push(pieza);
    else grupos.push([pieza]);
  }
  for (const grupo of grupos) {
    const tex = grupo.map(texDeKatexHtml).join('').replace(/\s+/g, ' ').trim();
    grupo.slice(1).forEach((el) => el.remove());
    grupo[0].replaceWith(documento.createTextNode(tex ? `$${tex}$` : ''));
  }
  return grupos.length;
}

// KaTeX dibuja la ñ y algunos acentos como letra + tilde aparte ("n˜"): se vuelven a juntar.
const ACENTOS: Record<string, string> = {
  '˜': '\u0303', '´': '\u0301', 'ˊ': '\u0301', '`': '\u0300', 'ˋ': '\u0300', '¨': '\u0308', '^': '\u0302', 'ˆ': '\u0302',
};
function conAcentos(texto: string): string {
  return texto.replace(/\u200b/g, '')
    .replace(/([A-Za-z])([˜´ˊ`ˋ¨^ˆ])|([˜´ˊ`ˋ¨^ˆ])([A-Za-z])/g, (_, l1, a1, a2, l2) => (l1 ?? l2) + ACENTOS[a1 ?? a2])
    .normalize('NFC');
}

// Filas de una pila de KaTeX (fracciones, potencias): los hijos del primer .vlist, sin las vacías.
function filasDe(el: Element): Element[] {
  const vlist = el.querySelector('.vlist');
  return vlist ? [...vlist.children].filter((f) => !f.querySelector(':scope > .frac-line') && f.textContent?.replace(/\u200b/g, '').trim()) : [];
}

function texDeKatexHtml(el: Element): string {
  const c = el.classList;
  if (c.contains('pstrut') || c.contains('frac-line') || c.contains('vlist-s') || c.contains('strut')
    || c.contains('hide-tail') || c.contains('nulldelimiter') || c.contains('katex-mathml')) return '';
  if (c.contains('mfrac')) {
    // KaTeX dibuja primero el denominador y después el numerador.
    const [abajo, arriba] = filasDe(el);
    return `\\frac{${arriba ? texDeKatexHtml(arriba) : ''}}{${abajo ? texDeKatexHtml(abajo) : ''}}`;
  }
  if (c.contains('msupsub')) {
    // Con subíndice y potencia, va primero el subíndice. Si hay uno solo, la altura dice cuál es.
    const filas = filasDe(el);
    const altura = (f: Element) => parseFloat((f as HTMLElement).style?.top || '0');
    if (filas.length >= 2) return `_{${texDeKatexHtml(filas[0])}}^{${texDeKatexHtml(filas[1])}}`;
    if (filas.length === 1) return altura(filas[0]) < -2.8 ? `^{${texDeKatexHtml(filas[0])}}` : `_{${texDeKatexHtml(filas[0])}}`;
    return '';
  }
  if (c.contains('sqrt')) {
    const dentro = el.querySelector('.svg-align') ?? el;
    return `\\sqrt{${[...dentro.children].map(texDeKatexHtml).join('')}}`;
  }
  if (c.contains('text')) return comoTexto(conAcentos(el.textContent ?? ''));
  if (c.contains('mspace')) return ' ';
  if (el.children.length) return [...el.children].map(texDeKatexHtml).join('');
  return (el.textContent ?? '').replace(/\u200b/g, '');
}

// Texto dentro de una fórmula. Se escapan los caracteres que LaTeX usa como comandos.
const ESCAPES: Record<string, string> = {
  '\\': '\\textbackslash{}', '^': '\\textasciicircum{}', '~': '\\textasciitilde{}',
  '{': '\\{', '}': '\\}', $: '\\$', '&': '\\&', '#': '\\#', '%': '\\%', _: '\\_',
};
function comoTexto(texto: string): string {
  const limpio = texto.replace(/\u00a0/g, ' ').replace(/[\\^~{}$&#%_]/g, (c) => ESCAPES[c]);
  return limpio.trim() ? `\\text{${limpio}}` : '';
}

// Nombres de funciones que en LaTeX tienen su propio comando (se ven derechos, no en cursiva).
const FUNCIONES = new Set(['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'log', 'ln', 'exp', 'lim', 'max', 'min', 'det', 'sen']);

// MathML sin LaTeX (por ejemplo, el de Word): se arma un LaTeX simple con potencias, subíndices y fracciones.
function textoDeMathML(nodo: Element): string {
  const convertir = (el: Element): string => {
    const hijos = [...el.children];
    switch (el.localName) {
      case 'msup': return `{${convertir(hijos[0])}}^{${convertir(hijos[1])}}`;
      case 'msub': return `{${convertir(hijos[0])}}_{${convertir(hijos[1])}}`;
      case 'msubsup': return `{${convertir(hijos[0])}}_{${convertir(hijos[1])}}^{${convertir(hijos[2])}}`;
      case 'mfrac': return `\\frac{${convertir(hijos[0])}}{${convertir(hijos[1])}}`;
      case 'msqrt': return `\\sqrt{${hijos.map(convertir).join('')}}`;
      case 'mroot': return `\\sqrt[${convertir(hijos[1])}]{${convertir(hijos[0])}}`;
      // Palabras (en mtext, o en mi con más de una letra) van como texto: con espacios y acentos.
      case 'mtext': return comoTexto(el.textContent ?? '');
      case 'mi': {
        const t = el.textContent ?? '';
        if (FUNCIONES.has(t)) return t === 'sen' ? '\\operatorname{sen} ' : `\\${t} `;
        return t.length > 1 || /[^\x00-\x7f]/.test(t) ? comoTexto(t) : t;
      }
      case 'mspace': return '\\ ';
      case 'mn': case 'mo': return el.textContent ?? '';
      case 'annotation': case 'annotation-xml': return '';
      default: return hijos.length ? hijos.map(convertir).join('') : el.textContent ?? '';
    }
  };
  const math = nodo.localName === 'math' ? nodo : nodo.querySelector('math');
  // Sin MathML ni LaTeX no hay forma de rearmar la fórmula: se deja el texto tal cual, sin $…$
  // (como fórmula perdería los espacios).
  if (!math) return (nodo.textContent ?? '').trim();
  const tex = convertir(math).trim();
  return tex ? `$${tex}$` : '';
}

// Al pegar en un campo, si lo copiado trae fórmulas las cambia por su LaTeX en vez del texto roto.
// Si no trae fórmulas, deja que el navegador lo pegue como siempre.
export function pegarConFormulas(
  evento: ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  valor: string,
  cambiar: (nuevo: string) => void,
): void {
  let texto = textoPegadoConFormulas(evento.clipboardData.getData('text/html'));
  if (texto === null) return;
  evento.preventDefault();
  const campo = evento.currentTarget;
  // Un input de una sola línea no acepta saltos de línea.
  if (campo instanceof HTMLInputElement) texto = texto.replace(/\s*\n\s*/g, ' ');
  const inicio = campo.selectionStart ?? valor.length;
  const fin = campo.selectionEnd ?? valor.length;
  cambiar(valor.slice(0, inicio) + texto + valor.slice(fin));
}
