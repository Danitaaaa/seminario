import { z } from 'zod';

export const PrioridadSchema = z.enum(['alta', 'media', 'baja']);

// Fecha de calendario AAAA-MM-DD (sin hora). En la base es DATE.
export const FechaSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida, usar AAAA-MM-DD')
    .refine(f => {
        const d = new Date(`${f}T00:00:00Z`);
        return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === f;
    }, 'La fecha no existe');

// Identificador global de usuario (uid de Supabase), igual en todas las PCs.
export const IdGlobalUsuarioSchema = z.string().uuid();
// Usuario local (proyectos personales).
export const IdAsignadoSchema = z.number().int();

// Sin idProyecto (o null) la tarea es personal y pertenece al usuario que la crea.
export const CrearTareaDTOSchema = z.object({
    idProyecto: z.number().int().nullable().optional(),
    idUsuario: z.number().int(), // quien solicita (id local, para permisos)
    titulo: z.string().trim().min(1).max(200),
    descripcion: z.string().max(1000).nullable().optional(),
    prioridad: PrioridadSchema.default('media'),
    fechaLimite: FechaSchema.nullable().optional(),
    fechaInicio: FechaSchema.nullable().optional(),
    idAsignado: IdAsignadoSchema.nullable().optional(),             // solo tareas de proyecto
    idAsignadoGlobal: IdGlobalUsuarioSchema.nullable().optional(),  // solo tareas de proyecto
})
    .refine(d => !d.fechaInicio || !d.fechaLimite || d.fechaInicio <= d.fechaLimite, {
        message: 'La fecha de inicio no puede ser posterior a la fecha límite',
        path: ['fechaInicio'],
    })
    .refine(d => d.idProyecto != null || (d.idAsignado == null && d.idAsignadoGlobal == null), {
        message: 'Una tarea personal no se puede asignar a otro usuario',
        path: ['idAsignadoGlobal'],
    })
    .refine(d => d.idAsignado == null || d.idAsignadoGlobal == null, {
        message: 'Indicá un solo tipo de asignado',
        path: ['idAsignado'],
    });
export type CrearTareaDTO = z.input<typeof CrearTareaDTOSchema>;

// Sin idProyecto (o null) lista las tareas personales del usuario.
export const ListarTareasDTOSchema = z.object({
    idProyecto: z.number().int().nullable().optional(),
    idUsuario: z.number().int(),
});
export type ListarTareasDTO = z.infer<typeof ListarTareasDTOSchema>;

// Los campos que no vienen no se tocan. `null` en descripcion/fechaLimite/fechaInicio los borra.
export const ModificarTareaDTOSchema = z.object({
    idTarea: z.number().int(),
    idUsuario: z.number().int(),
    titulo: z.string().trim().min(1).max(200).optional(),
    descripcion: z.string().max(1000).nullable().optional(),
    prioridad: PrioridadSchema.optional(),
    fechaLimite: FechaSchema.nullable().optional(),
    fechaInicio: FechaSchema.nullable().optional(),
}).refine(d => !d.fechaInicio || !d.fechaLimite || d.fechaInicio <= d.fechaLimite, {
    message: 'La fecha de inicio no puede ser posterior a la fecha límite',
    path: ['fechaInicio'],
});
export type ModificarTareaDTO = z.infer<typeof ModificarTareaDTOSchema>;

// Marca/desmarca. Si no viene `completada`, invierte el estado actual.
export const AlternarTareaDTOSchema = z.object({
    idTarea: z.number().int(),
    idUsuario: z.number().int(),
    completada: z.boolean().optional(),
});
export type AlternarTareaDTO = z.infer<typeof AlternarTareaDTOSchema>;

// Mueve la tarea a la columna de un integrante. Sin ninguno de los dos = "sin asignar".
// Solo tareas de proyecto.
export const AsignarTareaDTOSchema = z.object({
    idTarea: z.number().int(),
    idUsuario: z.number().int(),
    idAsignado: IdAsignadoSchema.nullable().optional(),
    idAsignadoGlobal: IdGlobalUsuarioSchema.nullable().optional(),
}).refine(d => d.idAsignado == null || d.idAsignadoGlobal == null, {
    message: 'Indicá un solo tipo de asignado',
    path: ['idAsignado'],
});
export type AsignarTareaDTO = z.infer<typeof AsignarTareaDTOSchema>;

// Reparte las tareas pendientes sin asignar entre los integrantes con menos carga (siempre de un proyecto).
export const RepartirTareasDTOSchema = z.object({
    idProyecto: z.number().int(),
    idUsuario: z.number().int(),
});
export type RepartirTareasDTO = z.infer<typeof RepartirTareasDTOSchema>;

export const EliminarTareaDTOSchema = z.object({
    idTarea: z.number().int(),
    idUsuario: z.number().int(),
});
export type EliminarTareaDTO = z.infer<typeof EliminarTareaDTOSchema>;