export type TipoNota = 'parcial' | 'recuperatorio' | 'tp' | 'final' | 'otro';
export type EstadoNota = 'pendiente' | 'aprobado' | 'desaprobado' | 'sin_definir';

// Una nota del cuaderno: un parcial, un TP, un final... Sin nota todavía = pendiente.
export interface Nota {
  idNota: number;
  idMateria: number;
  tipo: TipoNota;
  nombre: string;
  fecha: string | null; // AAAA-MM-DD
  nota: number | null;
  estado: EstadoNota;
}

// El cuaderno es la materia vista con todo lo que tiene asociado.
export interface ResumenCuaderno {
  idMateria: number;
  nombre: string;
  formacion: string;
  anio: number | null;
  cuatrimestre: string | null;
  estado: string; // estado de la materia (cursando, aprobada...)
  archivos: number;
  flashcards: number;
  notasTotal: number;
  notasCargadas: number;
  proximo: { nombre: string; fecha: string } | null; // próxima nota pendiente con fecha
}

export interface Cuaderno {
  resumen: ResumenCuaderno;
  carpetas: { idNodo: number; nombre: string; elementos: number }[];
  mazos: { idDeck: number; nombre: string; flashcards: number }[];
  sesiones: { idSesion: number; nombre: string; fecha: string; estado: string }[];
  notas: Nota[];
}
