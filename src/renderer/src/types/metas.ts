// Metas mensuales: personales (sin idProyecto) o de un proyecto.
export interface Meta {
  idMeta: number;
  idProyecto: number | null; // null = meta personal
  titulo: string;
  descripcion: string | null;
  mes: string; // AAAA-MM
  // AAAA-MM-DD o null si la meta no tiene fecha.
  fechaLimite: string | null;
  completada: boolean;
  fechaCompletada: string | null;
  completadaPor: number | null;
  orden: number;
  creadaPor: number;
  fechaCreacion: string;
  idMetaOrigen: number | null;
  trasladadaA: string | null; // AAAA-MM del mes al que se pasó esta meta pendiente
}

export interface EstadisticasMetas {
  porMes: { mes: string; total: number; completadas: number; trasladadas: number }[];
  porMiembro: { idUsuario: number; completadas: number }[];
}

// Sin idProyecto son las metas personales del usuario.
// Se listan las de un mes, o las que vencen entre dos fechas (AAAA-MM-DD).
export interface ListarMetasInput {
  idProyecto?: number | null;
  idUsuario: number;
  mes?: string;
  desde?: string;
  hasta?: string;
}

export interface CrearMetaInput {
  idProyecto?: number | null;
  idUsuario: number;
  titulo: string;
  descripcion?: string | null;
  mes: string;
  fechaLimite?: string | null;
}

export interface ModificarMetaInput {
  idMeta: number;
  idUsuario: number;
  titulo?: string;
  descripcion?: string | null;
  orden?: number;
  fechaLimite?: string | null;
}

export interface AlternarMetaInput {
  idMeta: number;
  idUsuario: number;
  completada?: boolean;
}

export interface EliminarMetaInput {
  idMeta: number;
  idUsuario: number;
}

export interface CopiarMetasInput {
  idProyecto?: number | null;
  idUsuario: number;
  mesOrigen: string;
  mesDestino: string;
  soloPendientes?: boolean;
}

export interface EstadisticasMetasInput {
  idProyecto?: number | null;
  idUsuario: number;
  desde?: string;
  hasta?: string;
}

// Avisa que las metas cambiaron, para que el banner de inicio actualice su tarjeta.
export const EVENTO_METAS_ACTUALIZADAS = 'syntra:metas-actualizadas';

// Mes (AAAA-MM) de una fecha, en hora local.
export function mesDe(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
}