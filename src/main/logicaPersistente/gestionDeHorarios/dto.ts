import { z } from 'zod';

const horaSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'La hora debe tener formato HH:MM, ej. 13:00');

export const crearHorarioSchema = z.object({
  usuarioId: z.number().int().positive(),
  diaSemana: z.number().int().min(0).max(6),
  horaInicio: horaSchema,
  titulo: z.string().min(1).max(200),
});
export type CrearHorarioDTO = z.infer<typeof crearHorarioSchema>;

export const modificarHorarioSchema = z.object({
  id: z.number().int().positive(),
  diaSemana: z.number().int().min(0).max(6).optional(),
  horaInicio: horaSchema.optional(),
  titulo: z.string().min(1).max(200).optional(),
});
export type ModificarHorarioDTO = z.infer<typeof modificarHorarioSchema>;

export const eliminarHorarioSchema = z.object({ id: z.number().int().positive() });
export type EliminarHorarioDTO = z.infer<typeof eliminarHorarioSchema>;

export const listarHorariosSchema = z.object({ usuarioId: z.number().int().positive() });
export type ListarHorariosDTO = z.infer<typeof listarHorariosSchema>;
