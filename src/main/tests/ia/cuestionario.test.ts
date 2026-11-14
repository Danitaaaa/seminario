import { test, expect } from 'vitest';
import { cuestionarioSchema, leerCuestionarioGuardado, MENSAJE_CUESTIONARIO_ILEGIBLE, type Cuestionario } from '../../logicaNoPersistente/ia/esquemas';
import {
  corregirCuestionario,
  esRespuestaEscritaCorrecta,
  paraResolver,
} from '../../logicaPersistente/gestionDeMaterialIA/corregirCuestionario';

const cuestionario: Cuestionario = {
  titulo: 'Célula',
  preguntas: [
    {
      tipo: 'opcion_multiple', enunciado: '¿Qué produce la mitocondria?', opciones: ['Energía', 'ADN', 'Agua', 'Luz'],
      indiceCorrecta: 0, respuesta: null, explicacion: 'Hace respiración celular.', tema: 'Mitocondria',
    },
    {
      tipo: 'completar_seleccion', enunciado: 'La ___ es la unidad básica de la vida.', opciones: ['célula', 'molécula', 'proteína', 'tela'],
      indiceCorrecta: 0, respuesta: null, explicacion: 'Lo dice el material.', tema: 'Célula',
    },
    {
      tipo: 'completar_escrito', enunciado: 'La energía se produce en la ___.', opciones: [],
      indiceCorrecta: null, respuesta: 'mitocondria', explicacion: 'Respiración celular.', tema: 'Mitocondria',
    },
  ],
};

test('cuestionario: acepta los tres tipos de pregunta', () => {
  expect(cuestionarioSchema.safeParse(cuestionario).success).toBe(true);
});

test('cuestionario: una de completar sin hueco "___" no es válida', () => {
  const sinHueco = { ...cuestionario, preguntas: [{ ...cuestionario.preguntas[1], enunciado: 'La célula es la unidad básica.' }] };
  expect(cuestionarioSchema.safeParse(sinHueco).success).toBe(false);
});

test('cuestionario: completar escribiendo necesita la respuesta', () => {
  const sinRespuesta = { ...cuestionario, preguntas: [{ ...cuestionario.preguntas[2], respuesta: null }] };
  expect(cuestionarioSchema.safeParse(sinRespuesta).success).toBe(false);
});

test('cuestionario: con opciones necesita una correcta que exista', () => {
  const malIndice = { ...cuestionario, preguntas: [{ ...cuestionario.preguntas[0], indiceCorrecta: 9 }] };
  expect(cuestionarioSchema.safeParse(malIndice).success).toBe(false);
});

test('para resolver: no viajan las respuestas ni las explicaciones', () => {
  const texto = JSON.stringify(paraResolver(cuestionario));
  expect(texto.includes('indiceCorrecta')).toBe(false);
  expect(texto.includes('respuesta')).toBe(false);
  expect(texto.includes('explicacion')).toBe(false);
});

test('respuesta escrita: no importan mayúsculas, tildes ni un error de tipeo', () => {
  expect(esRespuestaEscritaCorrecta('  MITOCONDRIA. ', 'mitocondria')).toBe(true);
  expect(esRespuestaEscritaCorrecta('mitocondira', 'mitocondria')).toBe(true);
  expect(esRespuestaEscritaCorrecta('célula', 'celula')).toBe(true);
  expect(esRespuestaEscritaCorrecta('ribosoma', 'mitocondria')).toBe(false);
  expect(esRespuestaEscritaCorrecta('', 'mitocondria')).toBe(false);
  // En palabras cortas no se perdona el error: "ADM" no es "ADN".
  expect(esRespuestaEscritaCorrecta('ADM', 'ADN')).toBe(false);
});

test('corrección: cuenta las correctas y agrupa por tema lo que estuvo mal', () => {
  const r = corregirCuestionario(cuestionario, [1, 0, 'ribosoma']);
  expect(r.correctas).toBe(1);
  expect(r.total).toBe(3);
  expect(r.temasAReforzar).toEqual([{ tema: 'Mitocondria', errores: 2, total: 2 }]);
  expect(r.preguntas[0].respuestaCorrecta).toBe('Energía');
  expect(r.preguntas[2].respuestaCorrecta).toBe('mitocondria');
});

test('corrección: una pregunta en blanco cuenta como mal', () => {
  const r = corregirCuestionario(cuestionario, [0, 0, null]);
  expect(r.correctas).toBe(2);
  expect(r.preguntas[2].correcta).toBe(false);
});

test('corrección: todo bien no deja temas para reforzar', () => {
  expect(corregirCuestionario(cuestionario, [0, 0, 'Mitocondria']).temasAReforzar).toEqual([]);
});

test('cuestionarios guardados con el formato viejo (solo opción múltiple) se pueden leer', () => {
  const viejo = {
    titulo: 'Fotosíntesis',
    preguntas: [{ enunciado: '¿Dónde ocurre?', opciones: ['Cloroplasto', 'Núcleo'], indiceCorrecta: 0, explicacion: 'En el cloroplasto.' }],
  };
  const leido = leerCuestionarioGuardado(viejo);
  expect(leido.preguntas[0].tipo).toBe('opcion_multiple');
  expect(leido.preguntas[0].tema).toBe('Fotosíntesis');
  expect(leido.preguntas[0].respuesta).toBe(null);
});

test('un cuestionario ilegible da un mensaje entendible, no la lista de errores de zod', () => {
  let mensaje = '';
  try {
    leerCuestionarioGuardado({ titulo: 'x', preguntas: [{ enunciado: 'sin opciones' }] });
  } catch (e) {
    mensaje = (e as Error).message;
  }
  expect(mensaje).toBe(MENSAJE_CUESTIONARIO_ILEGIBLE);
});
