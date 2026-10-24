import { z } from 'zod';

/* ---------- Proyectos ---------- */

export const CrearProyectoDTOSchema = z.object({
    idUsuario: z.number().int(), // usuario que crea (queda como propietario)
    nombre: z.string().min(1).max(100),
    //materiaAsociada: z.string().max(100).optional(),
    fechaFin: z.coerce.date().optional(),
});
export type CrearProyectoDTO = z.infer<typeof CrearProyectoDTOSchema>;

export const ModificarProyectoDTOSchema = z.object({
    idProyecto: z.number().int(),
    idUsuario: z.number().int(), // quien solicita (control de permisos)
    nombre: z.string().min(1).max(100).optional(),
    //materiaAsociada: z.string().max(100).nullable().optional(),
    fechaFin: z.coerce.date().nullable().optional(),
});
export type ModificarProyectoDTO = z.infer<typeof ModificarProyectoDTOSchema>;

export const EliminarProyectoDTOSchema = z.object({
    idProyecto: z.number().int(),
    idUsuario: z.number().int(),
});
export type EliminarProyectoDTO = z.infer<typeof EliminarProyectoDTOSchema>;

export const ObtenerProyectoDTOSchema = z.object({
    idProyecto: z.number().int(),
    idUsuario: z.number().int(),
});
export type ObtenerProyectoDTO = z.infer<typeof ObtenerProyectoDTOSchema>;

export const ListarProyectosDTOSchema = z.object({
    idUsuario: z.number().int(),
    busqueda: z.string().max(250).optional(),
    umbral: z.number().min(0).max(1).optional(),
    incluirFinalizados: z.boolean().default(true),
    ordenarPor: z.enum(['nombre', 'fecha_creacion', 'fecha_fin']).default('nombre'),
    direccion: z.enum(['ASC', 'DESC']).default('ASC'),
});
export type ListarProyectosDTO = z.infer<typeof ListarProyectosDTOSchema>;

/* ---------- Miembros ---------- */

export const RolMiembroSchema = z.enum(['propietario', 'editor', 'lector']);

export const AgregarMiembroDTOSchema = z.object({
    idProyecto: z.number().int(),
    idUsuarioSolicitante: z.number().int(),
    idUsuarioNuevo: z.number().int(),
    rol: z.enum(['editor', 'lector']).default('editor'),
});
export type AgregarMiembroDTO = z.infer<typeof AgregarMiembroDTOSchema>;

export const QuitarMiembroDTOSchema = z.object({
    idProyecto: z.number().int(),
    idUsuarioSolicitante: z.number().int(),
    idUsuarioMiembro: z.number().int(), // si coincide con el solicitante, es "abandonar proyecto"
});
export type QuitarMiembroDTO = z.infer<typeof QuitarMiembroDTOSchema>;

export const ListarMiembrosDTOSchema = z.object({
    idProyecto: z.number().int(),
    idUsuarioSolicitante: z.number().int(),
    soloActivos: z.boolean().default(true),
});
export type ListarMiembrosDTO = z.infer<typeof ListarMiembrosDTOSchema>;

/* ---------- Sincronización ---------- */

export const SincronizarProyectoDTOSchema = z.object({
    idProyecto: z.number().int(),
    idUsuario: z.number().int(),
});
export type SincronizarProyectoDTO = z.infer<typeof SincronizarProyectoDTOSchema>;

export const UnirseAProyectoDTOSchema = z.object({
    idUsuario: z.number().int(),
    enlace: z.string().url().max(2048),
});
export type UnirseAProyectoDTO = z.infer<typeof UnirseAProyectoDTOSchema>;