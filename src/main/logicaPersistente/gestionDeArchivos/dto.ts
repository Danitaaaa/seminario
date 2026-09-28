import { z } from 'zod';

export const crearArchivoSchema = z.object({
  nombre: z.string().min(1).max(255),
  extension: z.string().min(1).max(20),
  rutaFisica: z.string().min(1),
  tamanio: z.number().int().positive(),
  nodoPadreId: z.number().int().positive().nullable(),
  usuarioId: z.number().int().positive().nullable(),
  proyectoId: z.number().int().positive().nullable(),
});
export type CrearArchivoDTO = z.infer<typeof crearArchivoSchema>;

export const modificarArchivoSchema = z.object({
  id: z.number().int().positive(),
  nombre: z.string().min(1).max(255),
});
export type ModificarArchivoDTO = z.infer<typeof modificarArchivoSchema>;

export const eliminarArchivoSchema = z.object({
  id: z.number().int().positive(),
});
export type EliminarArchivoDTO = z.infer<typeof eliminarArchivoSchema>;

// Valida mover uno o más archivos a una carpeta (o a la raíz si carpetaId es null).
export const moverArchivosSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1),
  carpetaId: z.number().int().positive().nullable(),
});
export type MoverArchivosDTO = z.infer<typeof moverArchivosSchema>;

export const listarArchivosSchema = z.object({
  proyectoId: z.number().int().positive(),
});
export type ListarArchivosDTO = z.infer<typeof listarArchivosSchema>;