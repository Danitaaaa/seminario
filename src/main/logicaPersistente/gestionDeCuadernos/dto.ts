import { z } from 'zod';

const id = z.number().int().positive();
const nombre = z.string({ error: 'El nombre es obligatorio.' }).trim()
  .min(1, 'El nombre es obligatorio.').max(100, 'El nombre puede tener hasta 100 caracteres.');

export const usuarioSchema = z.object({ usuarioId: id });
export type UsuarioDTO = z.infer<typeof usuarioSchema>;

export const cuadernoSchema = z.object({ usuarioId: id, idCuaderno: id });
export type CuadernoDTO = z.infer<typeof cuadernoSchema>;

export const crearCuadernoSchema = z.object({ usuarioId: id, nombre, idMateria: id });
export type CrearCuadernoDTO = z.infer<typeof crearCuadernoSchema>;

export const modificarCuadernoSchema = crearCuadernoSchema.extend({ idCuaderno: id });
export type ModificarCuadernoDTO = z.infer<typeof modificarCuadernoSchema>;

export const mazoCuadernoSchema = z.object({ usuarioId: id, idCuaderno: id, idDeck: id });
export type MazoCuadernoDTO = z.infer<typeof mazoCuadernoSchema>;

const datosNota = z.object({
  tipo: z.enum(['parcial', 'recuperatorio', 'tp', 'final', 'otro'], { error: 'Elegí el tipo.' }),
  nombre,
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha no es válida.').nullish().transform((v) => v ?? null),
  nota: z.number().min(0, 'La nota va de 0 a 10.').max(10, 'La nota va de 0 a 10.').nullish().transform((v) => v ?? null),
  // Si no viene, se calcula con la nota (ver reglasNotas).
  estado: z.enum(['pendiente', 'aprobado', 'desaprobado', 'sin_definir']).optional(),
});

export const crearNotaSchema = datosNota.extend({ usuarioId: id, idCuaderno: id });
export type CrearNotaDTO = z.infer<typeof crearNotaSchema>;

export const modificarNotaSchema = datosNota.extend({ usuarioId: id, idNota: id });
export type ModificarNotaDTO = z.infer<typeof modificarNotaSchema>;

export const notaSchema = z.object({ usuarioId: id, idNota: id });
export type NotaDTO = z.infer<typeof notaSchema>;
