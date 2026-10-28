export type Prioridad = 'alta' | 'media' | 'baja';

export interface Tarea {
  idTarea: number;
  // Identificador compartido entre PCs (columna id_global). Los ids locales no sirven para sincronizar.
  idGlobal: string;
  idProyecto: number;
  titulo: string;
  descripcion: string | null;
  prioridad: Prioridad;
  fechaLimite: string | null; // AAAA-MM-DD
  idAsignado: number | null;
  completada: boolean;
  fechaCompletada: string | null;
  completadaPor: number | null;
  orden: number;
  creadaPor: number;
  fechaCreacion: string;
}

// Datos editables desde el formulario de tarea.
export interface DatosTarea {
  titulo: string;
  descripcion: string | null;
  prioridad: Prioridad;
  fechaLimite: string | null;
  idAsignado: number | null;
}

export type FiltroTareas = 'todas' | 'pendientes' | 'hechas' | 'sinAsignar';

export type RolMiembro = 'propietario' | 'editor' | 'lector';

// Integrante que puede tener tareas (propietario o editor).
export interface MiembroTablero {
  idUsuario: number;
  nombre: string;
  rol: RolMiembro;
}

export interface ColorMiembro {
  fondo: string;
  texto: string;
}

export interface ColumnaMiembro extends MiembroTablero {
  color: ColorMiembro;
  esYo: boolean;
}

export interface SegmentoAporte {
  clave: string;
  nombre: string;
  hechas: number;
  porcentaje: number; // sobre el total de tareas del proyecto
  fondo: string;
}
