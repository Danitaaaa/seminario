import { test, expect } from 'vitest';
import { estimarTokens, fragmentar, fragmentarEnTextos } from '../../logicaNoPersistente/ia/fragmentador';

test('fragmentador: ningún fragmento supera el máximo de tokens', () => {
  const texto = '# Intro\n' + 'Hola mundo. '.repeat(50)
    + '\n\n# Capítulo largo\n' + ('Oración de relleno para el capítulo. '.repeat(100) + '\n\n').repeat(6);
  const fragmentos = fragmentar(texto, { maxTokens: 1000, solapamientoTokens: 50 });
  expect(fragmentos.length > 2).toBe(true);
  // El solapamiento puede sumar unos pocos tokens por encima del máximo.
  expect(fragmentos.every((f) => f.tokensAprox <= 1050)).toBe(true);
});

test('fragmentador: corta por títulos numerados de PDF', () => {
  // ~750 tokens cada sección: no entran juntas en 1000, así que queda una por fragmento.
  const texto = '1. Introducción\n' + 'a '.repeat(1500) + '\n2. Organelas\n' + 'b '.repeat(1500);
  const titulos = fragmentar(texto, { maxTokens: 1000 }).map((f) => f.titulo?.replace(/^\d+\.\s*/, ''));
  expect(titulos).toEqual(['Introducción', 'Organelas']);
});

test('fragmentarEnTextos: respeta el máximo, no pierde texto y parte párrafos gigantes', () => {
  const texto = ['a'.repeat(50), 'b'.repeat(50), 'c'.repeat(250)].join('\n\n');
  const frags = fragmentarEnTextos(texto, 100);
  expect(frags.every((f) => f.length <= 100)).toBe(true);
  expect(frags.join('').replace(/\s/g, '').length).toBe(350);
  expect(fragmentarEnTextos('   ')).toEqual([]);
});

test('fragmentador: agrupa secciones chicas en un solo fragmento', () => {
  const fragmentos = fragmentar('# A\nuno\n# B\ndos');
  expect(fragmentos).toHaveLength(1);
  expect(fragmentos[0]?.titulo).toBe('A');
  expect(fragmentos[0]?.texto).toContain('uno');
  expect(fragmentos[0]?.texto).toContain('dos');
  expect(estimarTokens('abcd')).toBe(1); // ~4 caracteres por token
  expect(estimarTokens('abcde')).toBe(2);
});

test('fragmentador: una sección partida repite el título y el final del fragmento anterior', () => {
  const p = (palabra: string) => `${`${palabra} `.repeat(59)}${palabra.toUpperCase()}`; // ~300 caracteres
  const texto = `# Tema\n${p('alfa')}\n\n${p('beta')}\n\n${p('gama')}`;

  const conSolape = fragmentar(texto, { maxTokens: 100, solapamientoTokens: 10 });
  expect(conSolape).toHaveLength(3);
  expect(conSolape.every((f) => f.titulo === 'Tema' && f.texto.startsWith('Tema\n'))).toBe(true);
  expect(conSolape[0]?.texto.includes('…')).toBe(false);
  expect(conSolape[1]?.texto).toContain('…'); // arranca con la cola del anterior
  expect(conSolape[1]?.texto).toContain('ALFA');

  const sinSolape = fragmentar(texto, { maxTokens: 100, solapamientoTokens: 0 });
  expect(sinSolape.some((f) => f.texto.includes('…'))).toBe(false);
});