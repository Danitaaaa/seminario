import { Evento } from './entidades';

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

export function desmaterializarEvento(evento: Evento): Record<string, unknown> {
  return {
    id: evento.id,
    usuario_id: evento.usuarioId,
    titulo: evento.titulo,
    descripcion: evento.descripcion,
    lugar: evento.lugar,
    fecha: evento.fecha,
    categoria: evento.categoria,
    prioridad: evento.prioridad,
    notificaciones_activas: evento.notificacionesActivas,
    recordatorios: JSON.stringify(evento.recordatorios),
  };
}

