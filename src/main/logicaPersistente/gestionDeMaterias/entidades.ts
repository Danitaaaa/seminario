export type TipoFormacion = 'grado' | 'pregrado' | 'posgrado' | 'curso' | 'academia' | 'otro';
export type Organizacion = 'cuatrimestral' | 'anual' | 'modulos' | 'sin_division';
export type Cuatrimestre = 'primero' | 'segundo' | 'anual';
export type EstadoMateria = 'no_cursada' | 'cursando' | 'libre' | 'regular' | 'aprobada';

// Lo que estudia el usuario: una carrera, un curso, una academia...
export interface Formacion {
  idFormacion: number;
  idUsuario: number;
  tipo: TipoFormacion;
  nombre: string;
  institucion: string | null;
  duracionAnios: number | null;
  organizacion: Organizacion;
  anioActual: number | null;
  cuatrimestreActual: 'primero' | 'segundo' | null;
}

// Materia de una formación. Es la misma tabla `materia` que usan las sesiones de estudio.
export interface MateriaFormacion {
  idMateria: number;
  idFormacion: number;
  nombre: string;
  anio: number | null;
  cuatrimestre: Cuatrimestre | null;
  estado: EstadoMateria;
}

// La materia `idMateria` necesita tener `idRequisito` para cursarse.
export interface Correlativa {
  idMateria: number;
  idRequisito: number;
}
