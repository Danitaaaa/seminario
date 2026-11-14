import { test, expect } from 'vitest';
import {
  COMBINAR,
  cuestionarioSchema,
  mapaMentalSchema,
  resumenSchema,
} from '../../logicaNoPersistente/ia/esquemas';
import { mapaValido } from './ayudas';

const pregunta = (cambios: object) => ({
  tipo: 'opcion_multiple', enunciado: '¿?', opciones: ['a', 'b'], indiceCorrecta: 0,
  respuesta: null, explicacion: 'e', tema: 'T', ...cambios,
});

test('cuestionario: rechaza una respuesta correcta que no existe', () => {
  const r = cuestionarioSchema.safeParse({ titulo: 'T', preguntas: [pregunta({ indiceCorrecta: 3 })] });
  expect(r.success).toBe(false);
  expect(r.error!.issues.some((i) => i.message.includes('no existe'))).toBe(true);
});

test('cuestionario: rechaza opciones repetidas', () => {
  const r = cuestionarioSchema.safeParse({ titulo: 'T', preguntas: [pregunta({ opciones: ['Sí', 'sí'] })] });
  expect(r.success).toBe(false);
});

test('mapa mental: rechaza nodos que cuelgan de un nodo inexistente', () => {
  const r = mapaMentalSchema.safeParse({ ...mapaValido, nodos: [...mapaValido.nodos, { id: 'x', texto: 'X', padreId: 'zz' }] });
  expect(r.success).toBe(false);
});

test('mapa mental: rechaza dos nodos centrales', () => {
  const r = mapaMentalSchema.safeParse({ ...mapaValido, nodos: [...mapaValido.nodos, { id: 'r2', texto: 'Otro', padreId: null }] });
  expect(r.success).toBe(false);
});

test('resumen: uno válido pasa la validación', () => {
  const r = resumenSchema.safeParse({ titulo: 'T', ideasClave: ['Idea'], secciones: [{ titulo: 'S', contenido: 'C' }] });
  expect(r.success).toBe(true);
});

test('combinar: los mapas de dos fragmentos dan un mapa válido', () => {
  const combinado = COMBINAR.mapaMental([mapaValido, mapaValido], 'Apunte');
  expect(mapaMentalSchema.safeParse(combinado).success).toBe(true);
  expect(combinado.nodos.length).toBe(7);
});
