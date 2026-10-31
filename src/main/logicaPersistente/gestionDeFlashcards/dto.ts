import { z } from 'zod';

// Valida los datos requeridos para crear un mazo.
export const crearDeckSchema = z.object({
    usuarioId: z.number().int().positive(),

    nombre: z.string({ error: 'El nombre del mazo es obligatorio.' })
        .trim()
        .min(1, { error: 'El nombre del mazo es obligatorio.' })
        .max(100, { error: 'El nombre del mazo no puede superar los 100 caracteres.' }),

    descripcion: z.string().optional(),

    materiaAsociada: z.string().max(100).optional(),
});

export type CrearDeckDTO = z.infer<typeof crearDeckSchema>;

export const modificarDeckSchema = z.object({
    usuarioId: z.number().int().positive(),

    deckId: z.number().int().positive(),

    nombre: z.string({ error: 'El nombre del mazo es obligatorio.' })
        .trim()
        .min(1, { error: 'El nombre del mazo es obligatorio.' })
        .max(100, { error: 'El nombre del mazo no puede superar los 100 caracteres.' }),
});

export type ModificarDeckDTO = z.infer<typeof modificarDeckSchema>;

export const eliminarDecksSchema = z.object({
    usuarioId: z.number().int().positive(),

    deckIds: z.array(z.number().int().positive())
        .min(1, { error: 'Debe seleccionar al menos un mazo para eliminar.' }),
});

export type EliminarDecksDTO = z.infer<typeof eliminarDecksSchema>;

// Valida las preguntas y respuestas antes de guardar una flashcard.
export const crearFlashcardSchema = z.object({
    usuarioId: z.number().int().positive(),

    deckId: z.number().int().positive(),

    pregunta: z.string({ error: 'La pregunta es obligatoria.' })
        .trim()
        .min(1, { error: 'La pregunta es obligatoria.' })
        .max(250, { error: 'La pregunta no puede superar los 250 caracteres.' }),

    respuesta: z.string({ error: 'La respuesta es obligatoria.' })
        .trim()
        .min(1, { error: 'La respuesta es obligatoria.' })
        .max(2000, { error: 'La respuesta no puede superar los 2000 caracteres.' }),
});

export type CrearFlashcardDTO = z.infer<typeof crearFlashcardSchema>;

// Valida los identificadores al consultar las tarjetas de un mazo.
export const listarFlashcardsSchema = z.object({
    usuarioId: z.number().int().positive(),

    deckId: z.number().int().positive(),
});

export type ListarFlashcardsDTO = z.infer<typeof listarFlashcardsSchema>;

export const modificarFlashcardSchema = z.object({
    usuarioId: z.number().int().positive(),

    idFlashcard: z.number().int().positive(),

    pregunta: z.string({ error: 'La pregunta es obligatoria.' })
        .trim()
        .min(1, { error: 'La pregunta es obligatoria.' })
        .max(250, { error: 'La pregunta no puede superar los 250 caracteres.' }),

    respuesta: z.string({ error: 'La respuesta es obligatoria.' })
        .trim()
        .min(1, { error: 'La respuesta es obligatoria.' })
        .max(2000, { error: 'La respuesta no puede superar los 2000 caracteres.' }),
});

export type ModificarFlashcardDTO = z.infer<typeof modificarFlashcardSchema>;

export const eliminarFlashcardsSchema = z.object({
    usuarioId: z.number().int().positive(),

    deckId: z.number().int().positive(),

    flashcardIds: z.array(z.number().int().positive())
        .min(1, { error: 'Debe seleccionar al menos una tarjeta para eliminar.' }),
});

export type EliminarFlashcardsDTO = z.infer<typeof eliminarFlashcardsSchema>;