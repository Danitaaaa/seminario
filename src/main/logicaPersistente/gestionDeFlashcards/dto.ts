import { z } from "zod";

export const crearDeckSchema = z.object({
    usuarioId: z.number().int().positive(),

    nombre: z
        .string()
        .min(1)
        .max(100),

    descripcion: z
        .string()
        .optional(),

    materiaAsociada: z
        .string()
        .max(100)
        .optional()
});

export type CrearDeckDTO =
    z.infer<typeof crearDeckSchema>;