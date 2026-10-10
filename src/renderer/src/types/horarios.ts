export const NOMBRES_DIA_SEMANA = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado',
] as const;

export interface HorarioCursado {
  id: number;
  usuarioId: number;
  diaSemana: number; // 0-6, igual a Date.getDay()
  horaInicio: string; // "HH:MM"
  horaFin: string; // "HH:MM"
  titulo: string;
}

export interface CrearHorarioInput {
  usuarioId: number;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  titulo: string;
}

export interface ModificarHorarioInput {
  id: number;
  diaSemana?: number;
  horaInicio?: string;
  horaFin?: string;
  titulo?: string;
}

export interface ListarHorariosInput {
  usuarioId: number;
}
