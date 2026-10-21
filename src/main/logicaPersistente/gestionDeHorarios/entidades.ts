// Representa un horario fijo que se puede visualizar en el calendario o cronograma
export interface HorarioCursado {
  id: number;
  usuarioId: number;
  diaSemana: number; // 0-6
  horaInicio: string; // "HH:MM", ej "13:00"
  horaFin: string; // "HH:MM", ej "14:30" — tiene que ser posterior a horaInicio
  titulo: string; // nombre de la materia
}
