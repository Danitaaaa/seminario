import { z } from 'zod';

const idSchema = z.number().int().positive();

export const crearMetaSchema = z.object({
  usuarioId: idSchema,
  titulo: z.string().trim()
    .min(1, 'Escribí la meta.')
    .max(120, 'La meta puede tener hasta 120 caracteres.'),
  fechaLimite: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha no es válida.')
    .nullable()
    .default(null),
});
export type CrearMetaDTO = z.infer<typeof crearMetaSchema>;

export const listarMetasSchema = z.object({ usuarioId: idSchema });
export type ListarMetasDTO = z.infer<typeof listarMetasSchema>;

export const completarMetaSchema = z.object({
  id: idSchema,
  usuarioId: idSchema,
  completada: z.boolean(),
});
export type CompletarMetaDTO = z.infer<typeof completarMetaSchema>;

export const eliminarMetaSchema = z.object({ id: idSchema, usuarioId: idSchema });
export type EliminarMetaDTO = z.infer<typeof eliminarMetaSchema>;