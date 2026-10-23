// Estados posibles de una sesión de estudio.
export type EstadoSesionEstudio = 'sin_empezar' | 'en_curso' | 'atrasada' | 'completada';

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
  pomodoroMin: number;
  descansoCortoMin: number;
  descansoLargoMin: number;
  recibirNotificacion: boolean;
  objetivos: ObjetivoSesion[];
  // Contenido del editor (HTML), se guarda también como .docx en Material.
  contenido: string;
  // Archivo .docx de la sesión en Material; null si todavía no se pudo generar.
  idArchivo: number | null;
}

// Opciones para armar el formulario de creación.
export interface OpcionesSesionEstudio {
  materias: Materia[];
  metodosEstudio: TipoMetodoEstudio[];
}
