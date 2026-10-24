// Una meta corta del dashboard ("Leer capítulo 3", "Preparar exposición").
export interface Meta {
  id: number;
  usuarioId: number;
  titulo: string;
  // Fecha en formato AAAA-MM-DD, o null si la meta no tiene fecha.
  fechaLimite: string | null;
  completada: boolean;
  fechaCreacion: Date;
}