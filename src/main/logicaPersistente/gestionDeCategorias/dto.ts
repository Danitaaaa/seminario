import { z } from 'zod';

export const crearCategoriaSchema = z.object({
  usuarioId: z.number().int().positive(),
  nombre: z.string().min(1).max(50),
});
export type CrearCategoriaDTO = z.infer<typeof crearCategoriaSchema>;

export const modificarCategoriaSchema = z.object({
  id: z.number().int().positive(),
  nombre: z.string().min(1).max(50),
});
export type ModificarCategoriaDTO = z.infer<typeof modificarCategoriaSchema>;

export const eliminarCategoriaSchema = z.object({ id: z.number().int().positive() });
export type EliminarCategoriaDTO = z.infer<typeof eliminarCategoriaSchema>;

export const listarCategoriasSchema = z.object({ usuarioId: z.number().int().positive() });
export type ListarCategoriasDTO = z.infer<typeof listarCategoriasSchema>;
