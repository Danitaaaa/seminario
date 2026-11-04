import { z } from 'zod';

// usuarioId = quien hace la operación. idProyecto ausente/null = categoría personal.
const nombre = z.string().trim().min(1).max(50);
const idProyecto = z.number().int().positive().nullish();

export const crearCategoriaSchema = z.object({
  usuarioId: z.number().int().positive(),
  idProyecto,
  nombre,
});
export type CrearCategoriaDTO = z.infer<typeof crearCategoriaSchema>;

export const modificarCategoriaSchema = z.object({
  usuarioId: z.number().int().positive(),
  id: z.number().int().positive(),
  nombre,
});
export type ModificarCategoriaDTO = z.infer<typeof modificarCategoriaSchema>;

export const eliminarCategoriaSchema = z.object({
  usuarioId: z.number().int().positive(),
  id: z.number().int().positive(),
});
export type EliminarCategoriaDTO = z.infer<typeof eliminarCategoriaSchema>;

// Con idProyecto: solo las de ese proyecto. Sin idProyecto: las personales + las de todos mis proyectos.
export const listarCategoriasSchema = z.object({
  usuarioId: z.number().int().positive(),
  idProyecto,
});
export type ListarCategoriasDTO = z.infer<typeof listarCategoriasSchema>;