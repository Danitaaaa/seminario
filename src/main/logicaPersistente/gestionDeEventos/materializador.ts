import { Evento } from './entidades';

// Convierte un registro de la BD a un objeto del tipo Evento
export function materializarEvento(fila: any): Evento {
  return {
    id: fila.id,
    usuarioId: fila.usuario_id,
    titulo: fila.titulo,
    descripcion: fila.descripcion,
    lugar: fila.lugar,
    fecha: fila.fecha,
    idProyecto: fila.id_proyecto ?? null,
    nombreProyecto: fila.nombre_proyecto ?? null,
    categoria: fila.categoria ?? 'Otro',
    prioridad: fila.prioridad ?? 'media',
    notificacionesActivas: fila.notificaciones_activas ?? false,
    recordatorios: leerRecordatorios(fila.recordatorios),
  };

  
  // Los recordatorios llegan como arreglo (columna jsonb). Si llegan como texto se interpreta el JSON;
  // si están vacíos o mal formados, se devuelve una lista vacía para no romper la pantalla.
  function leerRecordatorios(valor: unknown): Evento['recordatorios'] {
    if (Array.isArray(valor)) return valor;
    if (typeof valor !== 'string') return [];
    try {
      const leido = JSON.parse(valor);
      return Array.isArray(leido) ? leido : [];
    } catch {
      return [];
    }
  }
}

