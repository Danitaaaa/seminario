export type TipoNotificacion = 'evento' | 'meta' | 'sesion' | 'proyecto';

export interface Notificacion {
  id: number;
  usuarioId: number;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  leida: boolean;
  fecha: Date;
}