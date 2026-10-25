export type Categoria = string;
export type Prioridad = 'leve' | 'media' | 'importante';
export type UnidadTiempo = 'minutos' | 'horas' | 'dias' | 'semanas';

// Representa un recordatorio para un evento
export interface Recordatorio {
  cantidad: number;
  unidad: UnidadTiempo;
}

// Representa un evento visualizable en el calendario
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
