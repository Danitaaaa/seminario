import { z } from 'zod';

export const registrarRevisionSchema = z.object({
    usuarioId: z.number().int().positive(),
    flashcardId: z.number().int().positive(),
    dificultad: z.enum(['dificil', 'intermedio', 'facil']),
});

export type RegistrarRevisionDTO = z.infer<typeof registrarRevisionSchema>;

export const guardarRepeticionMaterialSchema = z.object({
    usuarioId: z.number().int().positive(),
    nodoId: z.number().int().positive(),
    intervaloDias: z.union([z.literal(1), z.literal(3), z.literal(7), z.literal(14)]),
});

export type GuardarRepeticionMaterialDTO = z.infer<typeof guardarRepeticionMaterialSchema>;
