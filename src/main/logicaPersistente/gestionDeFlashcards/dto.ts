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

// Valida las preguntas y respuestas antes de guardar una flashcard.
export const crearFlashcardSchema = z.object({
    usuarioId: z.number().int().positive(),
    deckId: z.number().int().positive(),
    pregunta: z.string({ error: 'La pregunta es obligatoria.' })
        .trim()
        .min(1, { error: 'La pregunta es obligatoria.' })
        .max(100, { error: 'La pregunta no puede superar los 100 caracteres.' }),
    respuesta: z.string({ error: 'La respuesta es obligatoria.' })
        .trim()
        .min(1, { error: 'La respuesta es obligatoria.' })
        .max(1000, { error: 'La respuesta no puede superar los 1000 caracteres.' }),
});

export type CrearFlashcardDTO = z.infer<typeof crearFlashcardSchema>;

// Valida los identificadores al consultar las tarjetas de un mazo.
export const listarFlashcardsSchema = z.object({
    usuarioId: z.number().int().positive(),
    deckId: z.number().int().positive(),
});