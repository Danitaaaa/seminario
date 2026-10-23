// Tipos espejo del módulo Sesión de estudio. Las fechas cruzan IPC como string.

export type EstadoSesionEstudio = 'sin_empezar' | 'en_curso' | 'atrasada' | 'completada';

export type FasePomodoro = 'pomodoro' | 'descanso_corto' | 'descanso_largo';

export interface Materia {
  idMateria: number;
  nombre: string;
}

export interface TipoMetodoEstudio {
  idTipoMetodoEstudio: number;
  nombre: string;
}

export interface ObjetivoSesion {
  idObjetivo: number;
  idSesion: number;
  descripcion: string;
  completado: boolean;
  orden: number;
}

export interface SesionEstudio {
  idSesion: number;
  idUsuario: number;
  nombre: string;
  duracion: number;
  materiaAsociada: Materia;
  metodosEstudio: TipoMetodoEstudio[];
  estado: EstadoSesionEstudio;
  fechaCreacion: string;
  fechaProgramada: string;
  fechaUltimoAcceso: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  pomodoroMin: number;
  descansoCortoMin: number;
  descansoLargoMin: number;
  recibirNotificacion: boolean;
  objetivos: ObjetivoSesion[];
  contenido: string;
  idArchivo: number | null;
}

export interface OpcionesSesionEstudio {
  materias: Materia[];
  metodosEstudio: TipoMetodoEstudio[];
}

export interface EstadoPomodoro {
  fase: FasePomodoro;
  segundosFase: number;
  segundosRestantes: number;
  numeroPomodoro: number;
  pomodorosCompletados: number;
}

export interface SnapshotSesionEnCurso {
  idSesion: number;
  segundosTranscurridos: number;
  segundosPlanificados: number;
  tiempoPlanificadoCumplido: boolean;
  pomodoro: EstadoPomodoro;
}

export interface CrearSesionEstudioEntrada {
  usuarioId: number;
  nombre: string;
  idMateria: number;
  idsMetodosEstudio: number[];
  duracion: number;
  pomodoroMin: number;
  descansoCortoMin: number;
  descansoLargoMin: number;
  fechaProgramada: string;
  recibirNotificacion: boolean;
  objetivos: string[];
}

export interface ModificarSesionEstudioEntrada {
  usuarioId: number;
  idSesion: number;
  nombre?: string;
  duracion?: number;
  fechaProgramada?: string;
  recibirNotificacion?: boolean;
}

// Funciones que expone el preload para este módulo (se suman al tipo Window.api en window.d.ts).
export interface SesionesEstudioApi {
  crearSesionEstudio(datos: CrearSesionEstudioEntrada): Promise<SesionEstudio>;
  listarSesionesEstudio(filtros: { usuarioId: number; desde?: string; hasta?: string }): Promise<SesionEstudio[]>;
  abrirSesionEstudio(usuarioId: number, idSesion: number): Promise<SesionEstudio>;
  iniciarSesionEstudio(usuarioId: number, idSesion: number): Promise<SesionEstudio>;
  finalizarSesionEstudio(usuarioId: number, idSesion: number): Promise<SesionEstudio>;
  modificarSesionEstudio(datos: ModificarSesionEstudioEntrada): Promise<SesionEstudio>;
  guardarContenidoSesionEstudio(datos: { usuarioId: number; idSesion: number; contenido: string }): Promise<void>;
  eliminarSesionEstudio(usuarioId: number, idSesion: number): Promise<void>;
  agregarObjetivoSesion(datos: { usuarioId: number; idSesion: number; descripcion: string }): Promise<ObjetivoSesion>;
  actualizarObjetivoSesion(datos: {
    usuarioId: number;
    idObjetivo: number;
    descripcion?: string;
    completado?: boolean;
  }): Promise<ObjetivoSesion>;
  eliminarObjetivoSesion(usuarioId: number, idObjetivo: number): Promise<void>;
  listarOpcionesSesionEstudio(): Promise<OpcionesSesionEstudio>;
  obtenerSesionEnCurso(usuarioId: number): Promise<{
    sesion: SesionEstudio | null;
    snapshot: SnapshotSesionEnCurso | null;
  }>;
  onTickSesionEstudio(callback: (snapshot: SnapshotSesionEnCurso) => void): () => void;
}
