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

export interface CuatrimestreDelCuaderno {
  idCuatrimestre: number;
  nombre: string; // "2° cuatrimestre 2026"
  corto: string; // "2C 2026"
  fechaInicio: string;
  fechaFin: string;
}

export interface ResumenCuaderno {
  idCuaderno: number;
  nombre: string;
  materia: MateriaDelCuaderno;
  cuatrimestre: CuatrimestreDelCuaderno | null;
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
  materialesIA: { idMaterialIA: number; tipo: 'resumen' | 'cuestionario' | 'mapaMental'; titulo: string }[];
  notas: Nota[];
  cursadas: { idCuaderno: number; cuatrimestre: string | null; actual: boolean }[];
  cuentaPara: { idMateria: number; nombre: string; formacion: string }[];
}

export interface DatosCuaderno {
  nombre: string;
  idMateria: number;
  idCuatrimestre: number | null;
  materiasExtra: number[];
}

export interface CuadernosApi {
  listarCuadernos(datos: { usuarioId: number }): Promise<ResumenCuaderno[]>;
  obtenerCuaderno(datos: { usuarioId: number; idCuaderno: number }): Promise<Cuaderno>;
  crearCuaderno(datos: { usuarioId: number } & DatosCuaderno): Promise<{ idCuaderno: number }>;
  modificarCuaderno(datos: { usuarioId: number; idCuaderno: number } & DatosCuaderno): Promise<{ ok: boolean }>;
  eliminarCuaderno(datos: { usuarioId: number; idCuaderno: number }): Promise<{ ok: boolean }>;
  agregarMazoCuaderno(datos: { usuarioId: number; idCuaderno: number; idDeck: number }): Promise<{ ok: boolean }>;
  quitarMazoCuaderno(datos: { usuarioId: number; idCuaderno: number; idDeck: number }): Promise<{ ok: boolean }>;
  agregarMaterialIACuaderno(datos: { usuarioId: number; idCuaderno: number; idMaterialIA: number }): Promise<{ ok: boolean }>;
  quitarMaterialIACuaderno(datos: { usuarioId: number; idCuaderno: number; idMaterialIA: number }): Promise<{ ok: boolean }>;
  crearNota(datos: { usuarioId: number; idCuaderno: number } & DatosNota): Promise<Nota>;
  modificarNota(datos: { usuarioId: number; idNota: number } & DatosNota): Promise<Nota>;
  eliminarNota(datos: { usuarioId: number; idNota: number }): Promise<{ ok: boolean }>;
}
