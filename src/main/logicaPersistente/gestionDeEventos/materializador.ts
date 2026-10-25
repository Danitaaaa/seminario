import { Evento } from './entidades';

// Convierte un registro de la BD a un objeto del tipo Evento.
export function materializarEvento(fila: any): Evento {
  return {
    id: fila.id,
    usuarioId: fila.usuario_id,
    titulo: fila.titulo,
    descripcion: fila.descripcion,
    lugar: fila.lugar,
    fecha: fila.fecha,
    categoria: fila.categoria ?? 'Otro',
    prioridad: fila.prioridad ?? 'media',
    notificacionesActivas: fila.notificaciones_activas ?? false,
    recordatorios: fila.recordatorios ?? [],
  };
}

