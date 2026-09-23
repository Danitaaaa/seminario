import { z } from 'zod';

export const CrearNodoDTOSchema = z.object({
    nombre: z.string().min(1).max(250),
    idPadre: z.number().int().nullable(),
});
export type CrearNodoDTO = z.infer<typeof CrearNodoDTOSchema>;


export const BuscarNodosDTOSchema = z.object({
    idPadre: z.number().int().nullable(),
    busqueda: z.string().max(250).optional(),
    umbral: z.number().min(0).max(1).optional(),
    ordenarPor: z.enum(['nombre', 'fecha_carga', 'fecha_ultimo_acceso', 'fecha_ultima_modificacion', 'tamaño']).default('nombre').optional(),
    direccion: z.enum(['ASC', 'DESC']).default('ASC').optional(),
});
export type BuscarNodosDTO = z.infer<typeof BuscarNodosDTOSchema>;


export const ModificarNodoDTOSchema = z.object({
    id: z.number().int(),
    nombre: z.string().min(1).max(250),
});
export type ModificarNodoDTO = z.infer<typeof ModificarNodoDTOSchema>;

export const MoverNodoDTOSchema = z.object({
    id: z.number().int(),
    idNuevoPadre: z.number().int().nullable(), 
});
export type MoverNodoDTO = z.infer<typeof MoverNodoDTOSchema>;

export const EliminarNodoDTOSchema = z.object({
    id: z.number().int(),
});
export type EliminarNodoDTO = z.infer<typeof EliminarNodoDTOSchema>;