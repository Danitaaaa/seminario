import { z } from "zod";

export const crearDeckSchema = z.object({
    usuarioId: z.number().int().positive(),

    nombre: z.string().min(1).max(100),

    descripcion: z.string().optional(),

    materiaAsociada: z.string().max(100).optional()
});

export type CrearDeckDTO =
    z.infer<typeof crearDeckSchema>;

export const crearFlashcardSchema = z.object({
    usuarioId: z.number().int().positive(),
    deckId: z.number().int().positive(),
    pregunta: z.string().trim().min(1).max(2000),
    respuesta: z.string().trim().min(1).max(10000),
});

export type CrearFlashcardDTO = z.infer<typeof crearFlashcardSchema>;

export const listarFlashcardsSchema = z.object({
    usuarioId: z.number().int().positive(),
    deckId: z.number().int().positive(),
});