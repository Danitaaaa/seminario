import { z } from 'zod';

export const seccionResumenSchema = z.object({
  titulo: z.string().trim()
    .min(1, { error: 'Cada sección necesita un título.' })
    .max(200, { error: 'El título de la sección no puede superar los 200 caracteres.' })
    .describe('Título corto de la sección'),
  contenido: z.string().trim()
    .min(1, { error: 'Cada sección necesita contenido.' })
    .describe('Explicación de la sección en prosa clara'),
});

export const resumenSchema = z.object({
  titulo: z.string().trim()
    .min(1, { error: 'El resumen necesita un título.' })
    .max(200, { error: 'El título no puede superar los 200 caracteres.' })
    .describe('Título del resumen'),
  ideasClave: z.array(z.string().trim().min(1, { error: 'Hay una idea clave vacía.' }))
    .min(1, { error: 'El resumen necesita al menos una idea clave.' })
    .max(15, { error: 'Como máximo 15 ideas clave.' })
    .describe('Entre 3 y 10 ideas principales, una oración cada una'),
  secciones: z.array(seccionResumenSchema)
    .min(1, { error: 'El resumen necesita al menos una sección.' })
    .describe('Desarrollo del resumen por temas'),
});

export type Resumen = z.infer<typeof resumenSchema>;

// ---------- Pedidos del front (resumen como documento editable que se guarda en Material) ----------

const idTrabajo = z.uuid({ error: 'Identificador de trabajo inválido.' });

export const generarResumenDocumentoSchema = z.object({
  trabajoId: idTrabajo,
  idArchivo: z.number().int().positive(),
  indicaciones: z.string().trim().max(1800, { error: 'Las indicaciones no pueden superar los 1800 caracteres.' }).optional(),
});

export const guardarResumenDocumentoSchema = z.object({
  // Todos los trabajos que generaron partes de este documento (uno por archivo), para liberar las propuestas.
  trabajosIds: z.array(idTrabajo).max(50).optional(),
  nombre: z.string().trim().min(1, 'Poné un nombre.').max(150, 'El nombre es demasiado largo.'),
  html: z.string().min(1, 'El resumen no puede estar vacío.').max(2_000_000, 'El resumen es demasiado largo.'),
});
