// Algo de Syntra que se copia al calendario "Syntra" de Google.
export interface ItemCalendario {
  // Identifica el elemento en Google: tipo + id ("ev12", "se40", "cl3", "me7").
  clave: string;
  titulo: string;
  descripcion: string;
  lugar?: string;
  inicio: Date;
  fin: Date;
  todoElDia?: boolean; // metas: solo la fecha
  semanal?: boolean; // clases: se repiten cada semana
  hasta?: Date; // clases: última fecha en que se repiten (fin del cuatrimestre)
  excepciones?: Date[]; // clases: inicio de las que no se dan (feriados y recesos)
  color?: string; // colorId de Google Calendar (1 a 11)
}
