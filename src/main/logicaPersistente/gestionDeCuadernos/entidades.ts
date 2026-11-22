export type TipoNota = 'parcial' | 'recuperatorio' | 'tp' | 'final' | 'otro';
export type EstadoNota = 'pendiente' | 'aprobado' | 'desaprobado' | 'sin_definir';

// Una nota del cuaderno: un parcial, un TP, un final... Sin nota todavía = pendiente.
export interface Nota {
  idNota: number;
  idCuaderno: number;
  tipo: TipoNota;
  nombre: string;
  fecha: string | null; // AAAA-MM-DD
  nota: number | null;
  estado: EstadoNota;
}

export interface MateriaDelCuaderno {
  idMateria: number;
  nombre: string;
  formacion: string;
  anio: number | null;
  cuatrimestre: string | null;
  estado: string; // estado de la materia (cursando, aprobada...)
}

// Cuatrimestre de la cursada del cuaderno.
export interface CuatrimestreDelCuaderno {
  idCuatrimestre: number;
  nombre: string; // "2° cuatrimestre 2026"
  corto: string; // "2C 2026"
  fechaInicio: string;
  fechaFin: string;
}

// El cuaderno lo crea el usuario y le asocia una materia; muestra lo que tiene esa materia.
export interface ResumenCuaderno {
  idCuaderno: number;
  nombre: string;
  materia: MateriaDelCuaderno;
  cuatrimestre: CuatrimestreDelCuaderno | null; // null = cuaderno de antes de los cuatrimestres
  archivos: number;
  flashcards: number;
  notasTotal: number;
  notasCargadas: number;
  proximo: { nombre: string; fecha: string } | null; // próxima nota pendiente con fecha
}

export interface Cuaderno {
  resumen: ResumenCuaderno;
  carpetas: { idNodo: number; nombre: string; elementos: number }[];
  // aMano: lo agregó el usuario al cuaderno (los demás salen de la materia o de sus sesiones)
  mazos: { idDeck: number; nombre: string; flashcards: number; aMano: boolean }[];
  sesiones: { idSesion: number; nombre: string; fecha: string; estado: string }[];
  // Métodos de estudio usados en las sesiones de la materia, con cuántas sesiones los usaron.
  metodos: { nombre: string; sesiones: number }[];
  // Cuestionarios, mapas mentales y resúmenes con IA asociados a la materia.
  materialesIA: { idMaterialIA: number; tipo: 'resumen' | 'cuestionario' | 'mapaMental'; titulo: string }[];
  notas: Nota[];
  // Todas las veces que se cursó la materia (incluida esta), de la más nueva a la más vieja.
  cursadas: { idCuaderno: number; cuatrimestre: string | null; actual: boolean }[];
  // Materias de otras formaciones para las que también cuenta esta cursada.
  cuentaPara: { idMateria: number; nombre: string; formacion: string }[];
}
