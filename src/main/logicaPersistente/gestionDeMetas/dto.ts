import { z } from 'zod';

// Mes en formato AAAA-MM. En la base se guarda como el primer día del mes.
export const MesSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mes inválido, usar AAAA-MM');

// Día en formato AAAA-MM-DD (fecha límite de una meta).
const FechaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha no es válida.');

const TituloSchema = z.string().trim()
    .min(1, 'Escribí la meta.')
    .max(200, 'La meta puede tener hasta 200 caracteres.');

// En los DTO que traen idProyecto, omitirlo (o null) significa "metas personales del usuario".
const idProyectoOpcional = z.number().int().nullable().optional();

export const CrearMetaDTOSchema = z.object({
    idProyecto: idProyectoOpcional,
    idUsuario: z.number().int(), // quien solicita (control de permisos)
    titulo: TituloSchema,
    descripcion: z.string().max(1000).nullable().optional(),
    mes: MesSchema,
    fechaLimite: FechaSchema.nullable().optional(),
});
export type CrearMetaDTO = z.infer<typeof CrearMetaDTOSchema>;

// Las metas de un mes, o las que vencen entre `desde` y `hasta` (para el cronograma y los avisos).
export const ListarMetasDTOSchema = z.object({
    idProyecto: idProyectoOpcional,
    idUsuario: z.number().int(),
    mes: MesSchema.optional(),
    desde: FechaSchema.optional(),
    hasta: FechaSchema.optional(),
}).refine((d) => d.mes !== undefined || (d.desde !== undefined && d.hasta !== undefined), {
    message: 'Indicá un mes o un rango de fechas.',
});
export type ListarMetasDTO = z.infer<typeof ListarMetasDTOSchema>;

export const ModificarMetaDTOSchema = z.object({
    idMeta: z.number().int(),
    idUsuario: z.number().int(),
    titulo: TituloSchema.optional(),
    descripcion: z.string().max(1000).nullable().optional(),
    orden: z.number().int().min(0).optional(),
    fechaLimite: FechaSchema.nullable().optional(),
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