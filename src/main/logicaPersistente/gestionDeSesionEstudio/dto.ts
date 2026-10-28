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
  metas: z.array(z.string().trim().min(1).max(300)).max(50).default([]),
  // Mazo de flashcards para repasar en la sesión (si se eligió el método Flashcards).
  idDeck: idPositivo.nullable().default(null),
});
export type CrearSesionEstudioDTO = z.infer<typeof crearSesionEstudioSchema>;

// Esquema para modificar una sesión (CU12). Solo viajan los campos que cambian.
// Los minutos del Pomodoro se cambian desde el engranaje del panel Pomodoro.
export const modificarSesionEstudioSchema = z.object({
  idSesion: idPositivo,
  nombre: z.string().trim().min(1).max(100).optional(),
  idMateria: idPositivo.optional(),
  duracion: z.number().int().min(1).max(720).optional(),
  fechaProgramada: z.coerce.date().optional(),
  recibirNotificacion: z.boolean().optional(),
  pomodoroMin: z.number().int().min(1).max(180).optional(),
  descansoCortoMin: z.number().int().min(1).max(60).optional(),
  descansoLargoMin: z.number().int().min(1).max(120).optional(),
  // Mazo de flashcards de la sesión. null lo quita; si no viene, no se toca.
  idDeck: idPositivo.nullable().optional(),
  // Métodos de estudio de la sesión: si viene, reemplaza a los que tenía.
  idsMetodosEstudio: z.array(idPositivo).max(10).optional(),
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

// Esquema para agregar un meta a una sesión.
export const agregarObjetivoSchema = z.object({
  idSesion: idPositivo,
  descripcion: z.string().trim().min(1).max(300),
});
export type AgregarObjetivoDTO = z.infer<typeof agregarObjetivoSchema>;

// Esquema para editar o tildar un meta.
export const actualizarObjetivoSchema = z.object({
  idObjetivo: idPositivo,
  descripcion: z.string().trim().min(1).max(300).optional(),
  completado: z.boolean().optional(),
});
export type ActualizarObjetivoDTO = z.infer<typeof actualizarObjetivoSchema>;

// Esquema para eliminar un meta.
export const idObjetivoSchema = z.object({ idObjetivo: idPositivo });
export type IdObjetivoDTO = z.infer<typeof idObjetivoSchema>;

// Esquema para crear una pestaña nueva en el editor de la sesión.
export const crearPestanaSchema = z.object({
  idSesion: idPositivo,
  titulo: z.string().trim().min(1).max(60).optional(),
});
export type CrearPestanaDTO = z.infer<typeof crearPestanaSchema>;

// Esquema para renombrar una pestaña.
export const renombrarPestanaSchema = z.object({
  idPestana: idPositivo,
  titulo: z.string().trim().min(1).max(60),
});
export type RenombrarPestanaDTO = z.infer<typeof renombrarPestanaSchema>;

// Esquema para guardar el contenido (HTML) de una pestaña. Al guardar se actualiza
// también el documento completo de la sesión y su Word en Material.
export const guardarContenidoSesionSchema = z.object({
  idSesion: idPositivo,
  idPestana: idPositivo,
  contenido: z.string().max(2_000_000),
});
export type GuardarContenidoSesionDTO = z.infer<typeof guardarContenidoSesionSchema>;

// Esquema para las acciones que solo necesitan el id de la pestaña.
export const idPestanaSchema = z.object({ idPestana: idPositivo });

// Esquema para elegir la fase del Pomodoro (pestañas Pomodoro / Short Break / Long Break).
export const cambiarFasePomodoroSchema = z.object({
  idSesion: idPositivo,
  fase: z.enum(['pomodoro', 'descanso_corto', 'descanso_largo']),
});
export type CambiarFasePomodoroDTO = z.infer<typeof cambiarFasePomodoroSchema>;

// Esquema para buscar sesiones que se cruzan con un horario (advertencia al crear o reprogramar).
export const buscarSuperpuestasSchema = z.object({
  fechaProgramada: z.coerce.date(),
  duracion: z.number().int().min(1).max(720),
  excluirIdSesion: idPositivo.optional(),
});
export type BuscarSuperpuestasDTO = z.infer<typeof buscarSuperpuestasSchema>;

// Esquema para registrar una materia desde la pestaña de sesiones.
export const registrarMateriaSchema = z.object({
  nombre: z.string().trim().min(1, 'Escribí el nombre de la materia.').max(100),
});
export type RegistrarMateriaDTO = z.infer<typeof registrarMateriaSchema>;

// Esquema para cambiar el nombre de una materia.
export const modificarMateriaSchema = z.object({
  idMateria: idPositivo,
  nombre: z.string().trim().min(1, 'Escribí el nombre de la materia.').max(100),
});
export type ModificarMateriaDTO = z.infer<typeof modificarMateriaSchema>;

// Esquema para eliminar una materia.
export const idMateriaSchema = z.object({ idMateria: idPositivo });

// Esquema para el resumen (bienvenida y próxima sesión). Se puede excluir la sesión abierta.
export const resumenSesionesSchema = z.object({
  excluirIdSesion: idPositivo.optional(),
});
export type ResumenSesionesDTO = z.infer<typeof resumenSesionesSchema>;
