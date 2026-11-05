// Tipos espejo del módulo Cuadernos.

export type TipoNota = 'parcial' | 'recuperatorio' | 'tp' | 'final' | 'otro';
export type EstadoNota = 'pendiente' | 'aprobado' | 'desaprobado' | 'sin_definir';

export interface Nota {
  idNota: number;
  idMateria: number;
  tipo: TipoNota;
  nombre: string;
  fecha: string | null;
  nota: number | null;
  estado: EstadoNota;
}

export interface DatosNota {
  tipo: TipoNota;
  nombre: string;
  fecha: string | null;
  nota: number | null;
  estado?: EstadoNota;
}

export interface ResumenCuaderno {
  idMateria: number;
  nombre: string;
  formacion: string;
  anio: number | null;
  cuatrimestre: string | null;
  estado: string;
  archivos: number;
  flashcards: number;
  notasTotal: number;
  notasCargadas: number;
  proximo: { nombre: string; fecha: string } | null;
}

export interface Cuaderno {
  resumen: ResumenCuaderno;
  carpetas: { idNodo: number; nombre: string; elementos: number }[];
  mazos: { idDeck: number; nombre: string; flashcards: number }[];
  sesiones: { idSesion: number; nombre: string; fecha: string; estado: string }[];
  notas: Nota[];
}

export interface CuadernosApi {
  listarCuadernos(datos: { usuarioId: number }): Promise<ResumenCuaderno[]>;
  obtenerCuaderno(datos: { usuarioId: number; idMateria: number }): Promise<Cuaderno>;
  crearNota(datos: { usuarioId: number; idMateria: number } & DatosNota): Promise<Nota>;
  modificarNota(datos: { usuarioId: number; idNota: number } & DatosNota): Promise<Nota>;
  eliminarNota(datos: { usuarioId: number; idNota: number }): Promise<{ ok: boolean }>;
}
