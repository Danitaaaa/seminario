import { z } from 'zod';

export const categoriaEnum = z.string().min(1).max(50);
export const prioridadEnum = z.enum(['leve', 'media', 'importante']);
export const unidadTiempoEnum = z.enum(['minutos', 'horas', 'dias', 'semanas']);

export const recordatorioSchema = z.object({
  cantidad: z.number().int().positive().max(999),
  unidad: unidadTiempoEnum,
});

const baseEventoSchema = {
  titulo: z.string().min(1).max(200),
  descripcion: z.string().max(1000).optional().nullable(),
  lugar: z.string().max(200).optional().nullable(),
  categoria: categoriaEnum,
  prioridad: prioridadEnum,
  notificacionesActivas: z.boolean().default(false),
  recordatorios: z.array(recordatorioSchema).max(10).default([]),
};

export const crearEventoSchema = z
  .object({
    usuarioId: z.number().int().positive(),
    fecha: z.coerce.date(),
    ...baseEventoSchema,
  })
  .refine((datos) => !datos.notificacionesActivas || datos.recordatorios.length > 0, {
    message: 'Agregá al menos un recordatorio o desactivá las notificaciones.',
    path: ['recordatorios'],
  });
export type CrearEventoDTO = z.infer<typeof crearEventoSchema>;

export const modificarEventoSchema = z
  .object({
    id: z.number().int().positive(),
    fecha: z.coerce.date().optional(),
    titulo: baseEventoSchema.titulo.optional(),
    descripcion: baseEventoSchema.descripcion,
    lugar: baseEventoSchema.lugar,
    categoria: baseEventoSchema.categoria.optional(),
    prioridad: baseEventoSchema.prioridad.optional(),
    notificacionesActivas: z.boolean().optional(),
    recordatorios: z.array(recordatorioSchema).max(10).optional(),
  })
  .refine(
    (datos) =>
      datos.notificacionesActivas !== true ||
      (datos.recordatorios !== undefined && datos.recordatorios.length > 0),
    {
      message: 'Agregá al menos un recordatorio o desactivá las notificaciones.',
      path: ['recordatorios'],
    }
  );
export type ModificarEventoDTO = z.infer<typeof modificarEventoSchema>;

export const eliminarEventoSchema = z.object({
  id: z.number().int().positive(),
});
export type EliminarEventoDTO = z.infer<typeof eliminarEventoSchema>;

export const listarEventosSchema = z.object({
  usuarioId: z.number().int().positive(),
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
});
export type ListarEventosDTO = z.infer<typeof listarEventosSchema>;
