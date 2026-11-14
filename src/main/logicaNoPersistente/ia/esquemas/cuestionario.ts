import { z } from 'zod';

// Tres tipos de pregunta:
// - opcion_multiple: elegir la opción correcta.
// - completar_seleccion: el enunciado tiene un hueco "___" y se completa eligiendo una opción.
// - completar_escrito: el enunciado tiene un hueco "___" y se completa escribiendo la respuesta.
export const TIPOS_PREGUNTA = ['opcion_multiple', 'completar_seleccion', 'completar_escrito'] as const;
export type TipoPregunta = (typeof TIPOS_PREGUNTA)[number];

export const HUECO = '___';

// Todos los campos son obligatorios y los que no aplican van en null o vacíos (no .optional()):
// así lo acepta Azure en modo estricto y a los modelos chicos les cuesta menos.
export const preguntaSchema = z.object({
  tipo: z.enum(TIPOS_PREGUNTA, { error: 'Tipo de pregunta inválido.' })
    .describe('opcion_multiple, completar_seleccion o completar_escrito'),
  enunciado: z.string().trim().min(1, { error: 'Hay una pregunta sin enunciado.' })
    .describe('La pregunta. En las de completar, con un hueco "___" donde va la respuesta'),
  opciones: z.array(z.string().trim().min(1, { error: 'Hay una opción vacía.' }))
    .max(6, { error: 'Como máximo 6 opciones por pregunta.' })
    .describe('4 opciones para opcion_multiple y completar_seleccion; lista vacía para completar_escrito'),
  indiceCorrecta: z.number().int().min(0).nullable()
    .describe('Índice (desde 0) de la opción correcta; null en completar_escrito'),
  respuesta: z.string().trim().max(80, { error: 'La respuesta escrita es demasiado larga.' }).nullable()
    .describe('En completar_escrito, la palabra o frase corta exacta que va en el hueco; null en las demás'),
  explicacion: z.string().trim().min(1, { error: 'Falta la explicación de una pregunta.' })
    .describe('Por qué esa es la respuesta correcta'),
  tema: z.string().trim().min(1, { error: 'Hay una pregunta sin tema.' }).max(80)
    .describe('Tema o concepto del material que evalúa la pregunta, en pocas palabras'),
}).superRefine((p, ctx) => {
  const conOpciones = p.tipo !== 'completar_escrito';
  if (p.tipo !== 'opcion_multiple' && !p.enunciado.includes(HUECO)) {
    ctx.addIssue({ code: 'custom', path: ['enunciado'], message: `En las preguntas de completar, el enunciado tiene que tener el hueco "${HUECO}".` });
  }
  if (conOpciones) {
    if (p.opciones.length < 2) {
      ctx.addIssue({ code: 'custom', path: ['opciones'], message: 'Cada pregunta con opciones necesita al menos 2.' });
    }
    if (p.indiceCorrecta === null || p.indiceCorrecta >= p.opciones.length) {
      ctx.addIssue({ code: 'custom', path: ['indiceCorrecta'], message: 'Falta la opción correcta o no existe.' });
    }
    const normalizadas = p.opciones.map((o) => o.toLowerCase());
    if (new Set(normalizadas).size !== normalizadas.length) {
      ctx.addIssue({ code: 'custom', path: ['opciones'], message: 'Hay opciones repetidas.' });
    }
  } else if (!p.respuesta) {
    ctx.addIssue({ code: 'custom', path: ['respuesta'], message: 'Falta la respuesta de una pregunta para completar escribiendo.' });
  }
});

export const cuestionarioSchema = z.object({
  titulo: z.string().trim()
    .min(1, { error: 'El cuestionario necesita un título.' })
    .max(200, { error: 'El título no puede superar los 200 caracteres.' }),
  preguntas: z.array(preguntaSchema).min(1, { error: 'El cuestionario necesita al menos una pregunta.' }),
});

export type Pregunta = z.infer<typeof preguntaSchema>;
export type Cuestionario = z.infer<typeof cuestionarioSchema>;

export const MENSAJE_CUESTIONARIO_ILEGIBLE =
  'Este cuestionario no se puede abrir porque se guardó con un formato que ya no se usa. Eliminalo y generá uno nuevo.';

// Los cuestionarios guardados antes de los tres tipos de pregunta eran todos de opción múltiple
// y no tenían `tipo`, `respuesta` ni `tema`. Se completan al leerlos para poder abrirlos y resolverlos.
function completarFormatoViejo(contenido: unknown): unknown {
  if (!contenido || typeof contenido !== 'object') return contenido;
  const c = contenido as { titulo?: unknown; preguntas?: unknown };
  if (!Array.isArray(c.preguntas)) return contenido;
  const tema = (typeof c.titulo === 'string' && c.titulo.trim() ? c.titulo.trim() : 'General').slice(0, 80);
  return {
    ...c,
    preguntas: c.preguntas.map((p) =>
      p && typeof p === 'object' && !('tipo' in p) ? { tipo: 'opcion_multiple', respuesta: null, tema, ...p } : p,
    ),
  };
}

/** Lee un cuestionario guardado en la base (de cualquier versión). Si no se puede, da un error entendible. */
export function leerCuestionarioGuardado(contenido: unknown): Cuestionario {
  const r = cuestionarioSchema.safeParse(completarFormatoViejo(contenido));
  if (!r.success) throw new Error(MENSAJE_CUESTIONARIO_ILEGIBLE);
  return r.data;
}
