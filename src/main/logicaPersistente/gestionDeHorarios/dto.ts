import { z } from 'zod';

const horaSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'La hora debe tener formato HH:MM, ej. 13:00');

// Índice del tono de la paleta (0-5). El color real lo decide la paleta activa.
const tonoSchema = z.number().int().min(0).max(5);

export const crearHorarioSchema = z
  .object({
    usuarioId: z.number().int().positive(),
    diaSemana: z.number().int().min(0).max(6),
    horaInicio: horaSchema,
    horaFin: horaSchema,
    titulo: z.string().min(1).max(200),
    tono: tonoSchema.optional(),
    // Cuatrimestre en el que se cursa (NULL solo para los horarios cargados antes de que existieran).
    idCuatrimestre: z.number().int().positive().nullish().transform((v) => v ?? null),
    // Materia elegida de la lista (si se escribió otra cosa, queda NULL y vale el título).
    idMateria: z.number().int().positive().nullish().transform((v) => v ?? null),
  })
  .refine((d) => d.horaFin > d.horaInicio, {
    message: 'La hora de fin debe ser posterior a la hora de inicio',
    path: ['horaFin'],
  });
export type CrearHorarioDTO = z.infer<typeof crearHorarioSchema>;

// CAMBIO: en modificar, horaInicio y horaFin son opcionales por separado
// (se puede cambiar solo uno), así que el orden "fin > inicio" no se puede
// validar acá con los dos valores sueltos — se valida en ModificarHorario.ts,
// después de combinar lo que llega con lo que ya estaba guardado en la fila.
export const modificarHorarioSchema = z.object({
  id: z.number().int().positive(),
  diaSemana: z.number().int().min(0).max(6).optional(),
  horaInicio: horaSchema.optional(),
  horaFin: horaSchema.optional(),
  titulo: z.string().min(1).max(200).optional(),
  tono: tonoSchema.optional(),
  idMateria: z.number().int().positive().nullable().optional(),
});
export type ModificarHorarioDTO = z.infer<typeof modificarHorarioSchema>;

export const eliminarHorarioSchema = z.object({ id: z.number().int().positive() });
export type EliminarHorarioDTO = z.infer<typeof eliminarHorarioSchema>;

// Con cuatrimestre: los de ese cuatrimestre y los viejos que todavía no tienen uno.
export const listarHorariosSchema = z.object({
  usuarioId: z.number().int().positive(),
  idCuatrimestre: z.number().int().positive().optional(),
});
export type ListarHorariosDTO = z.infer<typeof listarHorariosSchema>;
// Pasa los horarios cargados antes de los cuatrimestres (sin cuatrimestre) a uno.
export const asignarCuatrimestreSchema = z.object({
  usuarioId: z.number().int().positive(),
  idCuatrimestre: z.number().int().positive(),
});
export type AsignarCuatrimestreDTO = z.infer<typeof asignarCuatrimestreSchema>;
