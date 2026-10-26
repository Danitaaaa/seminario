// De qué módulo viene el aviso. Sesiones y proyectos se suman cuando unamos esos módulos.
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