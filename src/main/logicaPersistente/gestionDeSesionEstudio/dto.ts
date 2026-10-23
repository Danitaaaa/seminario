import { z } from 'zod';

const idPositivo = z.number().int().positive();

// Usuario que realiza la acción. Sigue la convención del proyecto: llega en el DTO desde el renderer.
export const usuarioIdSchema = z.object({ usuarioId: idPositivo });

// Esquema para crear una sesión de estudio (CU11).
export const crearSesionEstudioSchema = z.object({
  nombre: z.string().trim().min(1).max(100),
  idMateria: idPositivo,
  idsMetodosEstudio: z.array(idPositivo).max(10).default([]),
  duracion: z.number().int().min(1).max(720),
  pomodoroMin: z.number().int().min(1).max(180).default(35),
  descansoCortoMin: z.number().int().min(1).max(60).default(10),
  descansoLargoMin: z.number().int().min(1).max(120).default(15),
  fechaProgramada: z.coerce.date(),
  recibirNotificacion: z.boolean().default(false),
  objetivos: z.array(z.string().trim().min(1).max(300)).max(50).default([]),
});
export type CrearSesionEstudioDTO = z.infer<typeof crearSesionEstudioSchema>;

// Esquema para modificar una sesión (CU12). Solo viajan los campos que cambian.
export const modificarSesionEstudioSchema = z.object({
  idSesion: idPositivo,
  nombre: z.string().trim().min(1).max(100).optional(),
  duracion: z.number().int().min(1).max(720).optional(),
  fechaProgramada: z.coerce.date().optional(),
  recibirNotificacion: z.boolean().optional(),
});
export type ModificarSesionEstudioDTO = z.infer<typeof modificarSesionEstudioSchema>;

// Esquema para las acciones que solo necesitan el id de la sesión (abrir, iniciar, finalizar, eliminar).
export const idSesionSchema = z.object({ idSesion: idPositivo });
export type IdSesionDTO = z.infer<typeof idSesionSchema>;

// Esquema para listar sesiones, con rango opcional para mostrarlas en el calendario.
export const listarSesionesEstudioSchema = z
  .object({
    desde: z.coerce.date().optional(),
    hasta: z.coerce.date().optional(),
  })
  .default({});
export type ListarSesionesEstudioDTO = z.infer<typeof listarSesionesEstudioSchema>;

// Esquema para agregar un objetivo a una sesión.
export const agregarObjetivoSchema = z.object({
  idSesion: idPositivo,
  descripcion: z.string().trim().min(1).max(300),
});
export type AgregarObjetivoDTO = z.infer<typeof agregarObjetivoSchema>;

// Esquema para editar o tildar un objetivo.
export const actualizarObjetivoSchema = z.object({
  idObjetivo: idPositivo,
  descripcion: z.string().trim().min(1).max(300).optional(),
  completado: z.boolean().optional(),
});
export type ActualizarObjetivoDTO = z.infer<typeof actualizarObjetivoSchema>;

// Esquema para eliminar un objetivo.
export const idObjetivoSchema = z.object({ idObjetivo: idPositivo });
export type IdObjetivoDTO = z.infer<typeof idObjetivoSchema>;

// Esquema para guardar el contenido del editor (HTML) de la sesión.
export const guardarContenidoSesionSchema = z.object({
  idSesion: idPositivo,
  contenido: z.string().max(2_000_000),
});
export type GuardarContenidoSesionDTO = z.infer<typeof guardarContenidoSesionSchema>;
