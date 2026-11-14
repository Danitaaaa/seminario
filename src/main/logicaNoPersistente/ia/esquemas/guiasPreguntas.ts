import { z } from 'zod';

const idTrabajo = z.uuid({ error: 'Identificador de trabajo inválido.' });
const indicaciones = z
  .string()
  .trim()
  .max(1800, { error: 'Las indicaciones no pueden superar los 1800 caracteres.' })
  .optional();

export const generarGuiaSchema = z.object({
  trabajoId: idTrabajo,
  idArchivo: z.number().int().positive(),
  cantidad: z.number().int().min(3).max(30).optional(),
  indicaciones: z.string().trim().max(1800, { error: 'Las indicaciones no pueden superar los 1800 caracteres.' }).optional(),
});

// La carpeta es obligatoria: el usuario elige dónde se guarda, desde Métodos de estudio o desde Material de estudio.
export const guardarGuiaSchema = z.object({
  trabajoId: idTrabajo.optional(),
  nombre: z.string().trim().min(1, 'Poné un nombre.').max(150, 'El nombre es demasiado largo.'),
  html: z.string().min(1, 'La guía no puede estar vacía.').max(2_000_000, 'La guía es demasiado larga.'),
});

// Lo que devuelve la IA para una guía de preguntas (salida del modelo, no el DTO de entrada).
// Azure en modo estricto: nada de .optional(); los campos opcionales van como .nullable().
export const guiaSchema = z.object({
  titulo: z.string().trim().min(1).max(150),
  preguntas: z
    .array(
      z.object({
        enunciado: z.string().trim().min(5, 'La pregunta es demasiado corta.').max(500),
        respuesta: z.string().trim().min(1, 'Falta la respuesta.').max(1500),
        tema: z.string().trim().max(120).nullable(),
      }),
    )
    .min(1, 'La guía no tiene preguntas.')
    .max(60),
});
export type Guia = z.infer<typeof guiaSchema>;