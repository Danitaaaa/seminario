import { test, expect } from 'vitest';
import { resumenAHtml } from '../../logicaPersistente/gestionDeMaterialIA/propuestas';
import { generarResumenDocumentoSchema, guardarResumenDocumentoSchema } from '../../logicaNoPersistente/ia/esquemas';

test('resumen como documento: título, ideas clave en lista y una sección por tema', () => {
  const html = resumenAHtml({
    titulo: 'La célula',
    ideasClave: ['Es la unidad básica de la vida', 'Tiene membrana <plasmática>'],
    secciones: [{ titulo: 'Núcleo', contenido: 'Guarda el ADN.\n\nControla la célula.' }],
  });
  expect(html.startsWith('<h1>La célula</h1>')).toBe(true);
  expect(html.includes('<li><p>Tiene membrana &lt;plasmática&gt;</p></li>')).toBe(true);
  expect(html.includes('<h2>Núcleo</h2>\n<p>Guarda el ADN.</p>\n<p>Controla la célula.</p>')).toBe(true);
});

test('resumen como documento: si la IA no devolvió nada útil, da error', () => {
  expect(() => resumenAHtml({ titulo: 'x', ideasClave: [], secciones: [] })).toThrow();
});

test('resumen como documento: valida los pedidos del front', () => {
  const trabajoId = '0b1e7f1e-7c0a-4e4b-9a57-2f7a3c0b1d11';
  expect(generarResumenDocumentoSchema.safeParse({ trabajoId, idArchivo: 3 }).success).toBe(true);
  expect(generarResumenDocumentoSchema.safeParse({ trabajoId: 'x', idArchivo: 3 }).success).toBe(false);
  expect(guardarResumenDocumentoSchema.safeParse({ nombre: '  ', html: '<p>a</p>' }).success).toBe(false);
  expect(guardarResumenDocumentoSchema.safeParse({ trabajosIds: [trabajoId], nombre: 'Resumen', html: '<p>a</p>' }).success).toBe(true);
});
