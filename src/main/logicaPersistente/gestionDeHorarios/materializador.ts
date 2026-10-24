import { HorarioCursado } from './entidades';

// Convierte un registro de la BD a un objeto del tipo Horario.
export function materializarHorario(fila: any): HorarioCursado {
  return {
    id: fila.id,
    usuarioId: fila.usuario_id,
    diaSemana: fila.dia_semana,
    horaInicio: fila.hora_inicio,
    horaFin: fila.hora_fin,
    titulo: fila.titulo,
  };
}
