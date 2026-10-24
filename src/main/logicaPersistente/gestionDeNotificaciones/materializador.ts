import { Notificacion } from './entidades';

// Convierte un registro de la BD en una Notificacion
export function materializarNotificacion(fila: any): Notificacion {
  return {
    id: fila.id,
    usuarioId: fila.usuario_id,
    tipo: fila.tipo,
    titulo: fila.titulo,
    mensaje: fila.mensaje ?? '',
    leida: fila.leida,
    fecha: fila.fecha,
  };
}