// Estados posibles de una sesión de estudio.
// Una sesión pausada sigue "en_curso"; la pausa se indica con el campo pausada.
export type EstadoSesionEstudio = 'sin_empezar' | 'en_curso' | 'atrasada' | 'completada';

// Fases del Pomodoro (Pomodoro, Short Break, Long Break).
export type FasePomodoro = 'pomodoro' | 'descanso_corto' | 'descanso_largo';

// Materia a la que se asocia una sesión.
export interface Materia {
  idMateria: number;
  nombre: string;
}

// Tipo de método de estudio elegible en una sesión (Repeticiones, Flashcards, etc.).
export interface TipoMetodoEstudio {
  idTipoMetodoEstudio: number;
  nombre: string;
}

// Objetivo que el usuario se propone cumplir durante la sesión.
export interface ObjetivoSesion {
  idObjetivo: number;
  idSesion: number;
  descripcion: string;
  completado: boolean;
  orden: number;
}

// Pestaña del editor de la sesión. El contenido es HTML y se guarda en la base.
export interface PestanaSesion {
  idPestana: number;
  idSesion: number;
  titulo: string;
  contenido: string;
  orden: number;
  fechaModificacion: Date;
}

// Estado guardado del Pomodoro. El main calcula a partir de esto los segundos restantes.
export interface EstadoPomodoroGuardado {
  fase: FasePomodoro;
  // Segundos que quedaban al pausarlo; null = la fase completa.
  restanteSeg: number | null;
  // Momento en que se dio START; null = detenido.
  corriendoDesde: Date | null;
  completados: number;
}

// Sesión de estudio completa, con su materia, métodos y objetivos.
export interface SesionEstudio {
  idSesion: number;
  idUsuario: number;
  nombre: string;
  // Duración planificada en minutos, definida por el usuario.
  duracion: number;
  materiaAsociada: Materia;
  metodosEstudio: TipoMetodoEstudio[];
  estado: EstadoSesionEstudio;
  fechaCreacion: Date;
  fechaProgramada: Date;
  fechaUltimoAcceso: Date;
  // Tiempos reales: se completan al iniciar y al finalizar.
  fechaInicio: Date | null;
  fechaFin: Date | null;
  // Pausa: si fechaPausa no es null la sesión está pausada desde ese momento.
  pausada: boolean;
  fechaPausa: Date | null;
  // Tiempo total que estuvo pausada (no cuenta como estudiado).
  segundosPausados: number;
  pomodoroMin: number;
  descansoCortoMin: number;
  descansoLargoMin: number;
  pomodoro: EstadoPomodoroGuardado;
  recibirNotificacion: boolean;
  objetivos: ObjetivoSesion[];
  // Documento completo (todas las pestañas en HTML), el mismo que se guarda como .docx en Material.
  contenido: string;
  // Archivo .docx de la sesión en Material; null si todavía no se pudo generar.
  idArchivo: number | null;
}

// Opciones para armar el formulario de creación.
export interface OpcionesSesionEstudio {
  materias: Materia[];
  metodosEstudio: TipoMetodoEstudio[];
}

// Datos para el encabezado de la pestaña de sesiones (cartel de bienvenida y próxima sesión).
export interface ResumenSesionesEstudio {
  nombreUsuario: string;
  proximaSesion: SesionEstudio | null;
}
