// Tipos espejo del módulo Cuadernos.

export type TipoNota = 'parcial' | 'recuperatorio' | 'tp' | 'final' | 'otro';
export type EstadoNota = 'pendiente' | 'aprobado' | 'desaprobado' | 'sin_definir';

export interface Nota {
  idNota: number;
  idCuaderno: number;
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

export interface MateriaDelCuaderno {
  idMateria: number;
  nombre: string;
  formacion: string;
  anio: number | null;
  cuatrimestre: string | null;
  estado: string;
}

export interface ResumenCuaderno {
  idCuaderno: number;
  nombre: string;
  materia: MateriaDelCuaderno;
  archivos: number;
  flashcards: number;
  notasTotal: number;
  notasCargadas: number;
  proximo: { nombre: string; fecha: string } | null;
}

export interface Cuaderno {
  resumen: ResumenCuaderno;
  carpetas: { idNodo: number; nombre: string; elementos: number }[];
  mazos: { idDeck: number; nombre: string; flashcards: number; aMano: boolean }[];
  sesiones: { idSesion: number; nombre: string; fecha: string; estado: string }[];
  metodos: { nombre: string; sesiones: number }[];
  notas: Nota[];
}

export interface CuadernosApi {
  listarCuadernos(datos: { usuarioId: number }): Promise<ResumenCuaderno[]>;
  obtenerCuaderno(datos: { usuarioId: number; idCuaderno: number }): Promise<Cuaderno>;
  crearCuaderno(datos: { usuarioId: number; nombre: string; idMateria: number }): Promise<{ idCuaderno: number }>;
  modificarCuaderno(datos: { usuarioId: number; idCuaderno: number; nombre: string; idMateria: number }): Promise<{ ok: boolean }>;
  eliminarCuaderno(datos: { usuarioId: number; idCuaderno: number }): Promise<{ ok: boolean }>;
  agregarMazoCuaderno(datos: { usuarioId: number; idCuaderno: number; idDeck: number }): Promise<{ ok: boolean }>;
  quitarMazoCuaderno(datos: { usuarioId: number; idCuaderno: number; idDeck: number }): Promise<{ ok: boolean }>;
  crearNota(datos: { usuarioId: number; idCuaderno: number } & DatosNota): Promise<Nota>;
  modificarNota(datos: { usuarioId: number; idNota: number } & DatosNota): Promise<Nota>;
  eliminarNota(datos: { usuarioId: number; idNota: number }): Promise<{ ok: boolean }>;
}
