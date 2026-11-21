import { z } from 'zod';

const usuarioId = z.number().int().positive('El usuario no es válido.');
const idNota = z.number().int().positive('La nota no es válida.');
const texto = z.string().trim().min(1, 'Escribí algo en la nota.').max(300, 'La nota no puede superar los 300 caracteres.');
// Cuatro tonos pastel sacados de la paleta elegida.
const color = z.number().int().min(0).max(3);

export const listarNotasSchema = z.object({ usuarioId, idNodo: z.number().int().positive('La carpeta no es válida.') });
export type ListarNotasDTO = z.infer<typeof listarNotasSchema>;

export const crearNotaSchema = z.object({ usuarioId, idNodo: z.number().int().positive('La carpeta no es válida.'), texto, color: color.default(0) });
export type CrearNotaDTO = z.infer<typeof crearNotaSchema>;

// Posición: x en porcentaje del ancho de la carpeta, y en píxeles desde arriba.
const posX = z.number().min(0).max(100);
const posY = z.number().min(0).max(100000);

export const modificarNotaSchema = z.object({
  usuarioId, idNota, texto: texto.optional(), color: color.optional(), posX: posX.optional(), posY: posY.optional(),
});
export type ModificarNotaDTO = z.infer<typeof modificarNotaSchema>;

export const eliminarNotaSchema = z.object({ usuarioId, idNota });
export type EliminarNotaDTO = z.infer<typeof eliminarNotaSchema>;
