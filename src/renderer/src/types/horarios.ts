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
  idCuatrimestre: number | null; // null = cargado antes de los cuatrimestres
  idMateria: number | null; // null = materia escrita a mano
}

export interface CrearHorarioInput {
  usuarioId: number;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  titulo: string;
  tono?: number;
  idCuatrimestre?: number | null;
  idMateria?: number | null;
}

export interface ModificarHorarioInput {
  id: number;
  diaSemana?: number;
  horaInicio?: string;
  horaFin?: string;
  titulo?: string;
  tono?: number;
  idMateria?: number | null;
}

export interface ListarHorariosInput {
  usuarioId: number;
  idCuatrimestre?: number;
}