import { z } from 'zod';

// Respuesta del Chat con IA. Es un objeto (y no texto suelto) para que pase por el mismo
// router que el resto: valida, reintenta si el formato está mal y usa el respaldo.
export const respuestaChatSchema = z.object({
  respuesta: z
    .string()
    .trim()
    .min(1, { error: 'La respuesta está vacía.' })
    .max(20000, { error: 'La respuesta es demasiado larga.' }),
});

export type RespuestaChat = z.infer<typeof respuestaChatSchema>;

// Transcripción de un plan de estudios: el texto con el formato que entiende "Leer plan".
// Si al plan le falta algo para poder pasarlo (hay varias carreras, orientaciones que se eligen, páginas que faltan),
// la IA no adivina: devuelve las preguntas con sus opciones y el texto vacío. Con las respuestas, se le vuelve a pedir.
export const preguntaPlanSchema = z.object({
  pregunta: z.string().trim().min(1).max(300),
  opciones: z.array(z.string().trim().min(1).max(200)).max(10),
});

export const transcripcionPlanSchema = z.object({
  preguntas: z.array(preguntaPlanSchema).max(4),
  texto: z.string().max(60000, { error: 'El plan transcripto es demasiado largo.' }),
});

export type PreguntaPlan = z.infer<typeof preguntaPlanSchema>;

export type TranscripcionPlan = z.infer<typeof transcripcionPlanSchema>;
