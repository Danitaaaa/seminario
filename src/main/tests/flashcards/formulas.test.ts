// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { separarFormulas, textoPegadoConFormulas, tieneFormulas } from '../../../renderer/src/utils/formulas';

describe('Flashcards: fórmulas en el texto', () => {
  it('separa texto y fórmulas en línea y en bloque', () => {
    expect(separarFormulas('El área es $\\pi r^2$ y listo')).toEqual([
      { tipo: 'texto', contenido: 'El área es ' },
      { tipo: 'formula', contenido: '\\pi r^2', bloque: false },
      { tipo: 'texto', contenido: ' y listo' },
    ]);
    expect(separarFormulas('$$\\int_0^1 x\\,dx$$')).toEqual([{ tipo: 'formula', contenido: '\\int_0^1 x\\,dx', bloque: true }]);
  });

  it('acepta la forma en que copia ChatGPT: \\( \\) y \\[ \\]', () => {
    const trozos = separarFormulas('Si \\(a>0\\) entonces \\[x = \\frac{-b}{2a}\\]');
    expect(trozos.filter((t) => t.tipo === 'formula')).toEqual([
      { tipo: 'formula', contenido: 'a>0', bloque: false },
      { tipo: 'formula', contenido: 'x = \\frac{-b}{2a}', bloque: true },
    ]);
  });

  it('un texto sin fórmulas queda igual', () => {
    expect(separarFormulas('Cuesta 5 pesos')).toEqual([{ tipo: 'texto', contenido: 'Cuesta 5 pesos' }]);
    expect(tieneFormulas('Cuesta 5 pesos')).toBe(false);
    expect(tieneFormulas('$x$')).toBe(true);
  });
});

describe('Flashcards: pegar fórmulas', () => {
  it('rescata el LaTeX de una fórmula de KaTeX (ChatGPT, apuntes)', () => {
    const html = `<p>La derivada es <span class="katex"><span class="katex-mathml"><math><semantics><mrow><mn>2</mn><mi>x</mi></mrow>
      <annotation encoding="application/x-tex">2x</annotation></semantics></math></span><span class="katex-html">2x</span></span>.</p>`;
    expect(textoPegadoConFormulas(html)).toBe('La derivada es $2x$.');
  });

  it('usa $$ para las fórmulas en bloque', () => {
    const html = `<span class="katex-display"><span class="katex"><math display="block"><semantics><mi>y</mi>
      <annotation encoding="application/x-tex">y = mx + b</annotation></semantics></math></span></span>`;
    expect(textoPegadoConFormulas(html)).toBe('$$y = mx + b$$');
  });

  it('arma el LaTeX desde MathML sin anotación (por ejemplo, Word)', () => {
    const html = '<math><msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><mfrac><mn>1</mn><mn>2</mn></mfrac></math>';
    expect(textoPegadoConFormulas(html)).toBe('${x}^{2}+\\frac{1}{2}$');
  });

  it('las palabras dentro de la fórmula quedan como texto, con espacios y ñ', () => {
    const html = '<math><mo>(</mo><mi>r</mi><mo>=</mo><mfrac><mtext>Elemento de Señal</mtext><mtext>Elemento de Datos</mtext></mfrac><mo>)</mo></math>';
    expect(textoPegadoConFormulas(html)).toBe('$(r=\\frac{\\text{Elemento de Señal}}{\\text{Elemento de Datos}})$');
  });

  it('escapa los símbolos de LaTeX que vienen en el texto y reconoce funciones', () => {
    const html = '<math><mi>sin</mi><mi>x</mi><mo>+</mo><mtext>50% y $</mtext></math>';
    expect(textoPegadoConFormulas(html)).toBe('$\\sin x+\\text{50\\% y \\$}$');
  });

  it('si lo pegado no tiene fórmulas devuelve null y se pega normal', () => {
    expect(textoPegadoConFormulas('<p>Hola</p>')).toBeNull();
    expect(textoPegadoConFormulas('')).toBeNull();
  });
});
