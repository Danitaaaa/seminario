import { z } from 'zod';

// Mes en formato AAAA-MM. En la base se guarda como el primer día del mes.
export const MesSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mes inválido, usar AAAA-MM');

// En los DTO que traen idProyecto, omitirlo (o null) significa "metas personales del usuario".
const idProyectoOpcional = z.number().int().nullable().optional();

export const CrearMetaDTOSchema = z.object({
    idProyecto: idProyectoOpcional,
    idUsuario: z.number().int(), // quien solicita (control de permisos)
    titulo: z.string().trim().min(1).max(200),
    descripcion: z.string().max(1000).nullable().optional(),
    mes: MesSchema,
});
export type CrearMetaDTO = z.infer<typeof CrearMetaDTOSchema>;

export const ListarMetasDTOSchema = z.object({
    idProyecto: idProyectoOpcional,
    idUsuario: z.number().int(),
    mes: MesSchema,
});
export type ListarMetasDTO = z.infer<typeof ListarMetasDTOSchema>;

export const ModificarMetaDTOSchema = z.object({
    idMeta: z.number().int(),
    idUsuario: z.number().int(),
    titulo: z.string().trim().min(1).max(200).optional(),
    descripcion: z.string().max(1000).nullable().optional(),
    orden: z.number().int().min(0).optional(),
});
export type ModificarMetaDTO = z.infer<typeof ModificarMetaDTOSchema>;

// Marca/desmarca. Si no viene `completada`, invierte el estado actual.
export const AlternarMetaDTOSchema = z.object({
    idMeta: z.number().int(),
    idUsuario: z.number().int(),
    completada: z.boolean().optional(),
});
export type AlternarMetaDTO = z.infer<typeof AlternarMetaDTOSchema>;

export const EliminarMetaDTOSchema = z.object({
    idMeta: z.number().int(),
    idUsuario: z.number().int(),
});
export type EliminarMetaDTO = z.infer<typeof EliminarMetaDTOSchema>;

// Reutiliza las metas de un mes en otro (por defecto, solo las pendientes).
export const CopiarMetasDTOSchema = z.object({
    idProyecto: idProyectoOpcional,
    idUsuario: z.number().int(),
    mesOrigen: MesSchema,
    mesDestino: MesSchema,
    soloPendientes: z.boolean().default(true),
});
export type CopiarMetasDTO = z.infer<typeof CopiarMetasDTOSchema>;

export const EstadisticasMetasDTOSchema = z.object({
    idProyecto: idProyectoOpcional,
    idUsuario: z.number().int(),
    desde: MesSchema.optional(),
    hasta: MesSchema.optional(),
});
export type EstadisticasMetasDTO = z.infer<typeof EstadisticasMetasDTOSchema>;