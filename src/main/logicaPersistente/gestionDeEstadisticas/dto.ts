import { z } from 'zod';

// Los gráficos se agrupan por día (período de una semana o un mes) o por mes (4 o 6 meses).
// El campo de cada barra se sigue llamando "mes", pero con 'dia' trae AAAA-MM-DD.
const agruparSchema = z.enum(['dia', 'mes']).default('mes');
export const FORMATO_AGRUPAR = { dia: 'YYYY-MM-DD', mes: 'YYYY-MM' } as const;

export const resumenProyectosSchema = z.object({
  idUsuario: z.number().int().positive('El usuario no es válido.'),
  // Mes de las metas (AAAA-MM). Lo manda la pantalla para usar la hora local y no la de Postgres.
  mes: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'El mes no es válido.'),
  // Día de hoy (AAAA-MM-DD), para saber qué tareas están vencidas.
  hoy: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha no es válida.'),
  // Desde qué día (AAAA-MM-DD, hora local) se cuentan las tareas completadas por mes.
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha no es válida.'),
  // Minutos que hay que sumarle a UTC para tener la hora de la compu (Argentina: -180).
  desfaseMinutos: z.number().int().min(-840, 'El desfase horario no es válido.').max(840, 'El desfase horario no es válido.'),
  agrupar: agruparSchema,
});
export type ResumenProyectosDTO = z.infer<typeof resumenProyectosSchema>;

export const resumenSesionesSchema = z.object({
  idUsuario: z.number().int().positive('El usuario no es válido.'),
  // Desde qué día (AAAA-MM-DD, hora local) se cuentan las sesiones.
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha no es válida.'),
  // Minutos que hay que sumarle a UTC para tener la hora de la compu (Argentina: -180).
  // Se manda el desfase y no el nombre de la zona: Postgres no reconoce todos los nombres que usa Windows.
  desfaseMinutos: z.number().int().min(-840, 'El desfase horario no es válido.').max(840, 'El desfase horario no es válido.'),
  agrupar: agruparSchema,
});
export type ResumenSesionesDTO = z.infer<typeof resumenSesionesSchema>;

// Los cuestionarios se piden con el mismo período que las sesiones.
export const resumenCuestionariosSchema = resumenSesionesSchema;
export type ResumenCuestionariosDTO = ResumenSesionesDTO;

// Y las flashcards también.
export const resumenFlashcardsSchema = resumenSesionesSchema;
export type ResumenFlashcardsDTO = ResumenSesionesDTO;

export const resumenMaterialSchema = z.object({ idUsuario: z.number().int().positive('El usuario no es válido.') });
export type ResumenMaterialDTO = z.infer<typeof resumenMaterialSchema>;
