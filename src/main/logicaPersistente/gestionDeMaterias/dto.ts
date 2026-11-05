import { z } from 'zod';

const id = z.number().int().positive();
const textoOpcional = (max: number) => z.string().trim().max(max).nullish().transform((v) => v || null);

const tipo = z.enum(['grado', 'pregrado', 'posgrado', 'curso', 'academia', 'otro'], { error: 'Elegí el tipo de formación.' });
const organizacion = z.enum(['cuatrimestral', 'anual', 'modulos', 'sin_division']);
const cuatrimestre = z.enum(['primero', 'segundo', 'anual']).nullable();
const estado = z.enum(['no_cursada', 'cursando', 'libre', 'regular', 'aprobada']);
const anio = z.number().int().min(1, 'El año va de 1 a 10.').max(10, 'El año va de 1 a 10.').nullable();
const nombreMateria = z.string({ error: 'El nombre es obligatorio.' }).trim()
  .min(1, 'El nombre es obligatorio.').max(100, 'El nombre puede tener hasta 100 caracteres.');

export const usuarioSchema = z.object({ usuarioId: id });
export type UsuarioDTO = z.infer<typeof usuarioSchema>;

export const crearFormacionSchema = z.object({
  usuarioId: id,
  tipo,
  nombre: z.string({ error: 'El nombre es obligatorio.' }).trim()
    .min(1, 'El nombre es obligatorio.').max(150, 'El nombre puede tener hasta 150 caracteres.'),
  institucion: textoOpcional(150),
  // Años, con medios años permitidos: 2.5 = dos años y medio.
  duracionAnios: z.number().min(0.5, 'La duración va de medio año a 10 años.').max(10, 'La duración va de medio año a 10 años.')
    .multipleOf(0.5, 'La duración va en años o medios años (por ejemplo 2,5).').nullish().transform((v) => v ?? null),
  organizacion: organizacion.default('cuatrimestral'),
  anioActual: anio.optional().transform((v) => v ?? null),
  cuatrimestreActual: z.enum(['primero', 'segundo']).nullish().transform((v) => v ?? null),
});
export type CrearFormacionDTO = z.infer<typeof crearFormacionSchema>;

export const modificarFormacionSchema = crearFormacionSchema.extend({ idFormacion: id });
export type ModificarFormacionDTO = z.infer<typeof modificarFormacionSchema>;

export const formacionSchema = z.object({ usuarioId: id, idFormacion: id });
export type FormacionDTO = z.infer<typeof formacionSchema>;

const datosMateria = z.object({
  nombre: nombreMateria,
  anio: anio.optional().transform((v) => v ?? null),
  cuatrimestre: cuatrimestre.optional().transform((v) => v ?? null),
  estado: estado.default('no_cursada'),
});

// Sirve para una materia cargada a mano y para todas las que salen del plan.
export const crearMateriasSchema = z.object({
  usuarioId: id,
  idFormacion: id,
  materias: z.array(datosMateria.extend({
    // Nombres de las materias que necesita, de la misma carga o ya cargadas en la formación.
    correlativas: z.array(z.string().trim().min(1).max(100)).max(200, 'Una materia tiene demasiadas correlativas.').default([]),
  })).min(1, 'No hay materias para agregar.').max(200),
});
export type CrearMateriasDTO = z.infer<typeof crearMateriasSchema>;

export const modificarMateriaSchema = datosMateria.extend({ usuarioId: id, idMateria: id });
export type ModificarMateriaDTO = z.infer<typeof modificarMateriaSchema>;

export const materiaSchema = z.object({ usuarioId: id, idMateria: id });
export type MateriaDTO = z.infer<typeof materiaSchema>;

// Reemplaza todas las correlativas de una materia por las que se mandan.
export const guardarCorrelativasSchema = z.object({
  usuarioId: id,
  idMateria: id,
  requisitos: z.array(id).max(200, 'Son demasiadas correlativas.'),
});
export type GuardarCorrelativasDTO = z.infer<typeof guardarCorrelativasSchema>;

export const leerPlanSchema = z.object({
  texto: z.string().trim().min(1, 'Pegá el texto del plan.').max(50000, 'El texto es demasiado largo.'),
});
export type LeerPlanDTO = z.infer<typeof leerPlanSchema>;
