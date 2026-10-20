export type Categoria = string;
export type Prioridad = 'leve' | 'media' | 'importante';
export type UnidadTiempo = 'minutos' | 'horas' | 'dias' | 'semanas';

export interface Recordatorio {
  cantidad: number;
  unidad: UnidadTiempo;
}

export interface Evento {
  id: number;
  usuarioId: number;
  titulo: string;
  descripcion: string | null;
  lugar: string | null;
  fecha: Date;
  categoria: Categoria;
  prioridad: Prioridad;
  notificacionesActivas: boolean;
  recordatorios: Recordatorio[]; 
}
