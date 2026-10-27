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
  tono: number | null; // tono de la paleta (0-5); null = automático
}

export interface CrearHorarioInput {
  usuarioId: number;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  titulo: string;
  tono?: number;
}

export interface ModificarHorarioInput {
  id: number;
  diaSemana?: number;
  horaInicio?: string;
  horaFin?: string;
  titulo?: string;
  tono?: number;
}

export interface ListarHorariosInput {
  usuarioId: number;
}