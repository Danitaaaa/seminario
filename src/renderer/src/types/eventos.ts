export type UnidadTiempo = 'minutos' | 'horas' | 'dias' | 'semanas';

export interface Recordatorio {
  cantidad: number;
  unidad: UnidadTiempo;
}

export type Categoria = string;

export const PRIORIDADES = ['leve', 'media', 'importante'] as const;
export type Prioridad = (typeof PRIORIDADES)[number];

export interface Evento {
  id: number;
  usuarioId: number;
  titulo: string;
  descripcion: string | null;
  lugar: string | null;
  fecha: Date;
  idProyecto: number | null;
  nombreProyecto: string | null;
  categoria: Categoria;
  prioridad: Prioridad;
  notificacionesActivas: boolean;
  recordatorios: Recordatorio[];
}

export interface CrearEventoInput {
  usuarioId: number;
  titulo: string;
  descripcion?: string | null;
  lugar?: string | null;
  fecha: string;
  categoria: Categoria;
  idProyecto?: number;
  prioridad: Prioridad;
  notificacionesActivas: boolean;
  recordatorios: Recordatorio[];
}

export interface ModificarEventoInput {
  id: number;
  usuarioId: number;
  titulo?: string;
  descripcion?: string | null;
  lugar?: string | null;
  fecha?: string;
  categoria?: Categoria;
  prioridad?: Prioridad;
  notificacionesActivas?: boolean;
  recordatorios?: Recordatorio[];
}

export interface ListarEventosInput {
  usuarioId: number;
  idProyecto?: number;
  desde?: string;
  hasta?: string;
}