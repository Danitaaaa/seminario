import { HorarioCursado } from './entidades';

export function materializarHorario(fila: any): HorarioCursado {
  return {
    id: fila.id,
    usuarioId: fila.usuario_id,
    diaSemana: fila.dia_semana,
    horaInicio: fila.hora_inicio,
    titulo: fila.titulo,
  };
}

export function desmaterializarHorario(h: HorarioCursado): Record<string, unknown> {
  return {
    id: h.id,
    usuario_id: h.usuarioId,
    dia_semana: h.diaSemana,
    hora_inicio: h.horaInicio,
    titulo: h.titulo,
  };
}
