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
  if (!html || !/<math|katex|MathJax/i.test(html)) return null;
  const documento = new DOMParser().parseFromString(html, 'text/html');
  let encontradas = 0;

  // KaTeX y MathJax guardan el LaTeX en una anotación dentro del MathML.
  const nodos = documento.querySelectorAll('.katex-display, .katex, mjx-container, math');
  nodos.forEach((nodo) => {
    if (!nodo.isConnected) return; // ya se reemplazó al procesar la fórmula que lo contiene
    const tex = nodo.querySelector('annotation[encoding="application/x-tex"]')?.textContent?.trim()
      ?? nodo.getAttribute('alttext')?.trim()
      ?? nodo.querySelector('math')?.getAttribute('alttext')?.trim();
    const enBloque = nodo.classList.contains('katex-display') || nodo.getAttribute('display') === 'block';
    const reemplazo = tex ? (enBloque ? `$$${tex}$$` : `$${tex}$`) : textoDeMathML(nodo);
    nodo.replaceWith(documento.createTextNode(reemplazo));
    encontradas++;
  });

  if (encontradas === 0) return null;
  // innerText respeta los saltos de línea de párrafos y <br>; textContent no.
  const cuerpo = documento.body;
  return (cuerpo.innerText || cuerpo.textContent || '').replace(/\u00a0/g, ' ').trim();
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
  const tex = math ? convertir(math).trim() : (nodo.textContent ?? '').trim();
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
