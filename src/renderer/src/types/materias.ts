// Tipos espejo del módulo Materias.

export type TipoFormacion = 'grado' | 'pregrado' | 'posgrado' | 'curso' | 'academia' | 'otro';
export type Organizacion = 'cuatrimestral' | 'anual' | 'modulos' | 'sin_division';
export type Cuatrimestre = 'primero' | 'segundo' | 'anual';
export type EstadoMateria = 'no_cursada' | 'cursando' | 'libre' | 'regular' | 'aprobada';

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

export interface MateriaFormacion {
  idMateria: number;
  idFormacion: number;
  nombre: string;
  anio: number | null;
  cuatrimestre: Cuatrimestre | null;
  estado: EstadoMateria;
}

export interface DatosMateria {
  nombre: string;
  anio: number | null;
  cuatrimestre: Cuatrimestre | null;
  estado: EstadoMateria;
}

export interface DatosFormacion {
  tipo: TipoFormacion;
  nombre: string;
  institucion: string | null;
  duracionAnios: number | null;
  organizacion: Organizacion;
  anioActual: number | null;
  cuatrimestreActual: 'primero' | 'segundo' | null;
}

export interface MateriaLeida {
  nombre: string;
  anio: number | null;
  cuatrimestre: Cuatrimestre | null;
  correlativas: string[];
}

export interface Correlativa {
  idMateria: number;
  idRequisito: number;
}

export interface OpcionMateria {
  idMateria: number;
  nombre: string;
  formacion: string; // nombre de la formación
  grupo: string;     // "Formación · 1° año"
  anio: number | null;
  estado: EstadoMateria;
}

// Cuatrimestre de cursada del usuario (vale para todas sus formaciones). Fechas en AAAA-MM-DD.
export interface Receso {
  desde: string;
  hasta: string;
  descripcion: string | null;
}

export interface CuatrimestreCursada {
  idCuatrimestre: number;
  anio: number;
  tipo: 'primero' | 'segundo';
  nombre: string; // "2° cuatrimestre 2026"
  fechaInicio: string;
  fechaFin: string;
  recesos: Receso[];
  horarios: number;
  cuadernos: number;
}

export interface DatosCuatrimestre {
  idCuatrimestre?: number;
  anio: number;
  tipo: 'primero' | 'segundo';
  fechaInicio: string;
  fechaFin: string;
  recesos: Receso[];
  copiarHorariosDe?: number;
}

export interface MateriasApi {
  listarFormaciones(datos: { usuarioId: number }): Promise<Formacion[]>;
  crearFormacion(datos: { usuarioId: number } & DatosFormacion): Promise<Formacion>;
  modificarFormacion(datos: { usuarioId: number; idFormacion: number } & DatosFormacion): Promise<Formacion>;
  eliminarFormacion(datos: { usuarioId: number; idFormacion: number }): Promise<{ ok: boolean }>;
  listarMateriasFormacion(datos: { usuarioId: number; idFormacion: number }): Promise<MateriaFormacion[]>;
  crearMaterias(datos: { usuarioId: number; idFormacion: number; materias: (DatosMateria & { correlativas?: string[] })[] }): Promise<MateriaFormacion[]>;
  modificarMateriaFormacion(datos: { usuarioId: number; idMateria: number } & DatosMateria): Promise<MateriaFormacion>;
  eliminarMateriaFormacion(datos: { usuarioId: number; idMateria: number }): Promise<{ ok: boolean }>;
  listarMateriasUsuario(datos: { usuarioId: number }): Promise<OpcionMateria[]>;
  listarCorrelativas(datos: { usuarioId: number; idFormacion: number }): Promise<Correlativa[]>;
  guardarCorrelativas(datos: { usuarioId: number; idMateria: number; requisitos: number[] }): Promise<Correlativa[]>;
  leerPlanEstudios(datos: { texto: string }): Promise<MateriaLeida[]>;
  listarCuatrimestres(datos: { usuarioId: number }): Promise<CuatrimestreCursada[]>;
  guardarCuatrimestre(datos: { usuarioId: number } & DatosCuatrimestre): Promise<CuatrimestreCursada>;
  eliminarCuatrimestre(datos: { usuarioId: number; idCuatrimestre: number }): Promise<{ ok: boolean }>;
  recursarMateria(datos: { usuarioId: number; idMateria: number; idCuatrimestre: number; copiarHorarios: boolean }): Promise<{ idCuaderno: number }>;
}
