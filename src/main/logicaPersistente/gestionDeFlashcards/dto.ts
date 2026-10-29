import { z } from "zod";

// Valida los datos requeridos para crear un mazo.
export const crearDeckSchema = z.object({
    usuarioId: z.number().int().positive(),

    nombre: z.string({ error: 'El nombre del mazo es obligatorio.' })
        .trim()
        .min(1, { error: 'El nombre del mazo es obligatorio.' })
        .max(50, { error: 'El nombre del mazo no puede superar los 50 caracteres.' }),

    descripcion: z.string().optional(),

    materiaAsociada: z.string().max(100).optional()
});

export type CrearDeckDTO =
    z.infer<typeof crearDeckSchema>;

// Valida la edición del nombre de un mazo.
export const modificarDeckSchema = z.object({
    usuarioId: z.number().int().positive(),
    deckId: z.number().int().positive(),
    nombre: crearDeckSchema.shape.nombre,
});

export type ModificarDeckDTO = z.infer<typeof modificarDeckSchema>;

const idsPositivosUnicosSchema = z.array(z.number().int().positive())
    .min(1)
    .refine((ids) => new Set(ids).size === ids.length, 'Los identificadores no pueden repetirse.');

// Valida las selecciones enviadas para eliminar mazos o flashcards.
export const eliminarDecksSchema = z.object({
    usuarioId: z.number().int().positive(),
    deckIds: idsPositivosUnicosSchema,
});

export type EliminarDecksDTO = z.infer<typeof eliminarDecksSchema>;

export const eliminarFlashcardsSchema = z.object({
    usuarioId: z.number().int().positive(),
    flashcardIds: idsPositivosUnicosSchema,
});

export type EliminarFlashcardsDTO = z.infer<typeof eliminarFlashcardsSchema>;

// Pregunta y respuesta de una flashcard: las mismas reglas al crearla y al editarla.
const preguntaSchema = z.string({ error: 'La pregunta es obligatoria.' })
    .trim()
    .min(1, { error: 'La pregunta es obligatoria.' })
    .max(250, { error: 'La pregunta no puede superar los 250 caracteres.' });

const respuestaSchema = z.string({ error: 'La respuesta es obligatoria.' })
    .trim()
    .min(1, { error: 'La respuesta es obligatoria.' })
    .max(2000, { error: 'La respuesta no puede superar los 2000 caracteres.' });

// Valida las preguntas y respuestas antes de guardar una flashcard.
export const crearFlashcardSchema = z.object({
    usuarioId: z.number().int().positive(),
    deckId: z.number().int().positive(),
    pregunta: preguntaSchema,
    respuesta: respuestaSchema,
});

export type CrearFlashcardDTO = z.infer<typeof crearFlashcardSchema>;

// Valida la edición de una flashcard: se reemplazan la pregunta y la respuesta.
export const modificarFlashcardSchema = z.object({
    usuarioId: z.number().int().positive(),
    idFlashcard: z.number().int().positive(),
    pregunta: preguntaSchema,
    respuesta: respuestaSchema,
});

export type ModificarFlashcardDTO = z.infer<typeof modificarFlashcardSchema>;

// Valida los identificadores al consultar las tarjetas de un mazo.
export const listarFlashcardsSchema = z.object({
    usuarioId: z.number().int().positive(),
    deckId: z.number().int().positive(),
});