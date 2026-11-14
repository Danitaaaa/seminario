import type { Cuestionario, Pregunta, TipoPregunta } from '../../logicaNoPersistente/ia/esquemas';

// Lo que ve el usuario mientras resuelve: sin la respuesta correcta ni la explicación.
export interface PreguntaParaResolver {
  tipo: TipoPregunta;
  enunciado: string;
  opciones: string[];
  tema: string;
}

// Respuesta del usuario: el índice de la opción elegida, el texto escrito, o null si la dejó en blanco.
export type RespuestaUsuario = number | string | null;

export interface PreguntaCorregida extends PreguntaParaResolver {
  respuestaUsuario: RespuestaUsuario;
  correcta: boolean;
  respuestaCorrecta: string; // en texto, para mostrarla en el resultado
  explicacion: string;
}

export interface TemaAReforzar {
  tema: string;
  errores: number;
  total: number;
}

export interface ResultadoCorreccion {
  preguntas: PreguntaCorregida[];
  correctas: number;
  total: number;
  temasAReforzar: TemaAReforzar[];
}

export function paraResolver(cuestionario: Cuestionario): { titulo: string; preguntas: PreguntaParaResolver[] } {
  return {
    titulo: cuestionario.titulo,
    preguntas: cuestionario.preguntas.map(({ tipo, enunciado, opciones, tema }) => ({ tipo, enunciado, opciones, tema })),
  };
}

// Para comparar lo escrito sin que importen mayúsculas, tildes, signos ni espacios de más.
export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Cuántos cambios de una letra hacen falta para pasar de un texto al otro. Agregar, quitar,
// cambiar o invertir dos letras seguidas ("mitocondira") cuenta como un solo cambio.
function distancia(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + costo);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

// Respuesta escrita: igual sin contar mayúsculas, tildes ni signos. En palabras de 5 letras
// o más se acepta un error de tipeo ("mitocondira" por "mitocondria").
export function esRespuestaEscritaCorrecta(escrita: string, correcta: string): boolean {
  const a = normalizarTexto(escrita);
  const b = normalizarTexto(correcta);
  if (!a) return false;
  if (a === b) return true;
  return b.length >= 5 && distancia(a, b) <= 1;
}

function esCorrecta(pregunta: Pregunta, respuesta: RespuestaUsuario): boolean {
  if (respuesta === null) return false;
  if (pregunta.tipo === 'completar_escrito') {
    return typeof respuesta === 'string' && esRespuestaEscritaCorrecta(respuesta, pregunta.respuesta ?? '');
  }
  return typeof respuesta === 'number' && respuesta === pregunta.indiceCorrecta;
}

function textoCorrecto(pregunta: Pregunta): string {
  return pregunta.tipo === 'completar_escrito'
    ? pregunta.respuesta ?? ''
    : pregunta.opciones[pregunta.indiceCorrecta ?? -1] ?? '';
}

// Corrige todas las respuestas y agrupa por tema las que estuvieron mal.
export function corregirCuestionario(cuestionario: Cuestionario, respuestas: RespuestaUsuario[]): ResultadoCorreccion {
  const preguntas = cuestionario.preguntas.map((p, i): PreguntaCorregida => {
    const respuestaUsuario = respuestas[i] ?? null;
    return {
      tipo: p.tipo,
      enunciado: p.enunciado,
      opciones: p.opciones,
      tema: p.tema,
      respuestaUsuario,
      correcta: esCorrecta(p, respuestaUsuario),
      respuestaCorrecta: textoCorrecto(p),
      explicacion: p.explicacion,
    };
  });

  const porTema = new Map<string, TemaAReforzar>();
  for (const p of preguntas) {
    const clave = normalizarTexto(p.tema);
    const actual = porTema.get(clave) ?? { tema: p.tema, errores: 0, total: 0 };
    actual.total++;
    if (!p.correcta) actual.errores++;
    porTema.set(clave, actual);
  }
  const temasAReforzar = [...porTema.values()]
    .filter((t) => t.errores > 0)
    .sort((a, b) => b.errores / b.total - a.errores / a.total || b.errores - a.errores);

  return {
    preguntas,
    correctas: preguntas.filter((p) => p.correcta).length,
    total: preguntas.length,
    temasAReforzar,
  };
}
