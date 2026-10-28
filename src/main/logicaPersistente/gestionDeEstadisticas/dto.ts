import { z } from 'zod';

export const resumenProyectosSchema = z.object({
  idUsuario: z.number().int().positive(),
  // Mes de las metas (AAAA-MM). Lo manda la pantalla para usar la hora local y no la de Postgres.
  mes: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'El mes no es válido.'),
  // Día de hoy (AAAA-MM-DD), para saber qué tareas están vencidas.
  hoy: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha no es válida.'),
});
export type ResumenProyectosDTO = z.infer<typeof resumenProyectosSchema>;

export const resumenSesionesSchema = z.object({
  idUsuario: z.number().int().positive(),
  // Desde qué día (AAAA-MM-DD, hora local) se cuentan las sesiones.
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha no es válida.'),
  // Zona horaria de la compu (ej. America/Argentina/Buenos_Aires): Postgres corre en UTC.
  zonaHoraria: z.string().regex(/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)*$/, 'La zona horaria no es válida.').max(64),
});
export type ResumenSesionesDTO = z.infer<typeof resumenSesionesSchema>;