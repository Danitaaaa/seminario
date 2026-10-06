// diaSemana usa el mismo criterio que Date.getDay() en JS: 0 = domingo, 6 = sábado.
// Así, del lado del calendario, comparar "¿este día cae en este horario?" es un
// simple fecha.getDay() === horario.diaSemana, sin tener que traducir nada.
export interface HorarioCursado {
  id: number;
  usuarioId: number;
  diaSemana: number; // 0-6
  horaInicio: string; // "HH:MM", ej "13:00"
  titulo: string; // nombre de la materia
}
