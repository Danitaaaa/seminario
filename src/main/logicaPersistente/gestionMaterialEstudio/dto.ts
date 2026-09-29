import { z } from 'zod';

/* ---------- Nodos (carpetas) ---------- */

export const CrearNodoDTOSchema = z.object({
    nombre: z.string().min(1).max(250),
    idPadre: z.number().int().nullable(),
});
export type CrearNodoDTO = z.infer<typeof CrearNodoDTOSchema>;

export const BuscarNodosDTOSchema = z.object({
    idPadre: z.number().int().nullable(),
    busqueda: z.string().max(250).optional(),
    umbral: z.number().min(0).max(1).optional(),
    ordenarPor: z.enum(['nombre', 'fecha_carga', 'fecha_ultimo_acceso', 'fecha_ultima_modificacion', 'tamaño']).default('nombre'),
    direccion: z.enum(['ASC', 'DESC']).default('ASC'),
});
export type BuscarNodosDTO = z.infer<typeof BuscarNodosDTOSchema>;

export const ListarContenidoDTOSchema = BuscarNodosDTOSchema.extend({
    idPadre: z.number().int(),
    tipo: z.enum(['carpeta', 'archivo']).optional(),
    ordenarPor: z.enum(['nombre', 'tipo', 'fecha_carga', 'fecha_ultimo_acceso', 'fecha_ultima_modificacion', 'tamaño']).default('nombre'),
});
export type ListarContenidoDTO = z.infer<typeof ListarContenidoDTOSchema>;

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

/* ---------- Archivos ---------- */

export const CrearArchivoDTOSchema = z.object({
    nombre: z.string().min(1).max(255),
    extension: z.string().min(1).max(20),
    rutaFisica: z.string().min(1),
    tamanio: z.number().int().nonnegative(), // nonnegative: permite archivos vacíos
    idPadre: z.number().int(),
});
export type CrearArchivoDTO = z.infer<typeof CrearArchivoDTOSchema>;

export const ModificarArchivoDTOSchema = z.object({
    id: z.number().int(),
    nombre: z.string().min(1).max(255),
});
export type ModificarArchivoDTO = z.infer<typeof ModificarArchivoDTOSchema>;

export const EliminarArchivoDTOSchema = z.object({
    id: z.number().int(),
});
export type EliminarArchivoDTO = z.infer<typeof EliminarArchivoDTOSchema>;

// Mover uno o más archivos a una carpeta (la raíz es el nodo con id 1).
export const MoverArchivosDTOSchema = z.object({
    ids: z.array(z.number().int()).min(1),
    idPadre: z.number().int(),
});
export type MoverArchivosDTO = z.infer<typeof MoverArchivosDTOSchema>;

export const BuscadorArchivoDTOSchema = z.object({
    idPadre: z.number().int(),
    busqueda: z.string().max(250).optional(),
    umbral: z.number().min(0).max(1).optional(),
    ordenarPor: z.enum(['nombre', 'fecha_carga', 'fecha_ultimo_acceso', 'fecha_ultima_modificacion', 'tamaño']).default('nombre'),
    direccion: z.enum(['ASC', 'DESC']).default('ASC'),
});
export type BuscadorArchivoDTO = z.infer<typeof BuscadorArchivoDTOSchema>;