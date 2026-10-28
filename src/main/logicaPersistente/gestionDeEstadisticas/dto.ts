import { z } from 'zod';

export const resumenProyectosSchema = z.object({
  idUsuario: z.number().int().positive(),
  // Mes de las metas (AAAA-MM). Lo manda la pantalla para usar la hora local y no la de Postgres.
  mes: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'El mes no es válido.'),
  // Día de hoy (AAAA-MM-DD), para saber qué tareas están vencidas.
  hoy: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha no es válida.'),
  // Desde qué día (AAAA-MM-DD, hora local) se cuentan las tareas completadas por mes.
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha no es válida.'),
  // Minutos que hay que sumarle a UTC para tener la hora de la compu (Argentina: -180).
  desfaseMinutos: z.number().int().min(-840).max(840),
});
export type ResumenProyectosDTO = z.infer<typeof resumenProyectosSchema>;

export const resumenSesionesSchema = z.object({
  idUsuario: z.number().int().positive(),
  // Desde qué día (AAAA-MM-DD, hora local) se cuentan las sesiones.
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha no es válida.'),
  // Minutos que hay que sumarle a UTC para tener la hora de la compu (Argentina: -180).
  // Se manda el desfase y no el nombre de la zona: Postgres no reconoce todos los nombres que usa Windows.
  desfaseMinutos: z.number().int().min(-840).max(840),
});
export type ResumenSesionesDTO = z.infer<typeof resumenSesionesSchema>;

export const resumenMaterialSchema = z.object({ idUsuario: z.number().int().positive() });
export type ResumenMaterialDTO = z.infer<typeof resumenMaterialSchema>;
