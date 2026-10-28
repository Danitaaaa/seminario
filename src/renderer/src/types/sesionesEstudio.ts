// Tipos espejo del módulo Sesión de estudio. Las fechas cruzan IPC como string.

export type EstadoSesionEstudio = 'sin_empezar' | 'en_curso' | 'atrasada' | 'completada';

export type FasePomodoro = 'pomodoro' | 'descanso_corto' | 'descanso_largo';

export interface Materia {
  idMateria: number;
  nombre: string;
}

export interface MateriaConUso extends Materia {
  cantidadSesiones: number;
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

export interface PestanaSesion {
  idPestana: number;
  idSesion: number;
  titulo: string;
  contenido: string;
  orden: number;
  fechaModificacion: string;
}

export interface EstadoPomodoroGuardado {
  fase: FasePomodoro;
  restanteSeg: number | null;
  corriendoDesde: string | null;
  completados: number;
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
  pausada: boolean;
  fechaPausa: string | null;
  segundosPausados: number;
  pomodoroMin: number;
  descansoCortoMin: number;
  descansoLargoMin: number;
  pomodoro: EstadoPomodoroGuardado;
  recibirNotificacion: boolean;
  metas: ObjetivoSesion[];
  contenido: string;
  idArchivo: number | null;
  idDeck: number | null;
}

export interface OpcionesSesionEstudio {
  materias: Materia[];
  metodosEstudio: TipoMetodoEstudio[];
}

export interface ResumenSesionesEstudio {
  nombreUsuario: string;
  proximaSesion: SesionEstudio | null;
}

export interface EstadoPomodoro {
  fase: FasePomodoro;
  segundosFase: number;
  segundosRestantes: number;
  corriendo: boolean;
  pomodorosCompletados: number;
}

export interface SnapshotSesionEnCurso {
  idSesion: number;
  pausada: boolean;
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
  metas: string[];
  idDeck?: number | null;
}

export interface ModificarSesionEstudioEntrada {
  usuarioId: number;
  idSesion: number;
  nombre?: string;
  idMateria?: number;
  duracion?: number;
  fechaProgramada?: string;
  recibirNotificacion?: boolean;
  pomodoroMin?: number;
  descansoCortoMin?: number;
  descansoLargoMin?: number;
  idDeck?: number | null;
  idsMetodosEstudio?: number[];
}

// Funciones que expone el preload para este módulo (se suman al tipo Window.api en window.d.ts).
export interface SesionesEstudioApi {
  crearSesionEstudio(datos: CrearSesionEstudioEntrada): Promise<SesionEstudio>;
  listarSesionesEstudio(filtros: { usuarioId: number; desde?: string; hasta?: string }): Promise<SesionEstudio[]>;
  buscarSesionesSuperpuestas(datos: { usuarioId: number; fechaProgramada: string; duracion: number; excluirIdSesion?: number; }): Promise<SesionEstudio[]>;
  abrirSesionEstudio(usuarioId: number, idSesion: number): Promise<SesionEstudio>;
  iniciarSesionEstudio(usuarioId: number, idSesion: number): Promise<SesionEstudio>;
  pausarSesionEstudio(usuarioId: number, idSesion: number): Promise<SesionEstudio>;
  reanudarSesionEstudio(usuarioId: number, idSesion: number): Promise<SesionEstudio>;
  finalizarSesionEstudio(usuarioId: number, idSesion: number): Promise<SesionEstudio>;
  modificarSesionEstudio(datos: ModificarSesionEstudioEntrada): Promise<SesionEstudio>;
  eliminarSesionEstudio(usuarioId: number, idSesion: number): Promise<void>;

  listarPestanasSesion(usuarioId: number, idSesion: number): Promise<PestanaSesion[]>;
  crearPestanaSesion(datos: { usuarioId: number; idSesion: number; titulo?: string }): Promise<PestanaSesion>;
  renombrarPestanaSesion(datos: { usuarioId: number; idPestana: number; titulo: string }): Promise<PestanaSesion>;
  eliminarPestanaSesion(usuarioId: number, idPestana: number): Promise<void>;
  guardarContenidoSesionEstudio(datos: {
    usuarioId: number;
    idSesion: number;
    idPestana: number;
    contenido: string;
  }): Promise<PestanaSesion>;

  agregarObjetivoSesion(datos: { usuarioId: number; idSesion: number; descripcion: string }): Promise<ObjetivoSesion>;
  actualizarObjetivoSesion(datos: {
    usuarioId: number;
    idObjetivo: number;
    descripcion?: string;
    completado?: boolean;
  }): Promise<ObjetivoSesion>;
  eliminarObjetivoSesion(usuarioId: number, idObjetivo: number): Promise<void>;

  iniciarPomodoro(usuarioId: number, idSesion: number): Promise<SesionEstudio>;
  pausarPomodoro(usuarioId: number, idSesion: number): Promise<SesionEstudio>;
  reiniciarPomodoro(usuarioId: number, idSesion: number): Promise<SesionEstudio>;
  cambiarFasePomodoro(datos: { usuarioId: number; idSesion: number; fase: FasePomodoro }): Promise<SesionEstudio>;

  listarOpcionesSesionEstudio(): Promise<OpcionesSesionEstudio>;
  listarMaterias(usuarioId: number): Promise<MateriaConUso[]>;
  registrarMateria(datos: { nombre: string }): Promise<MateriaConUso>;
  modificarMateria(datos: { usuarioId: number; idMateria: number; nombre: string }): Promise<MateriaConUso>;
  eliminarMateria(idMateria: number): Promise<void>;
  obtenerResumenSesiones(datos: { usuarioId: number; excluirIdSesion?: number }): Promise<ResumenSesionesEstudio>;
  obtenerSesionEnCurso(usuarioId: number): Promise<{
    sesion: SesionEstudio | null;
    snapshot: SnapshotSesionEnCurso | null;
  }>;
  onTickSesionEstudio(callback: (snapshot: SnapshotSesionEnCurso) => void): () => void;
}
