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

// Un evento o una sesión de Syntra que se cambió desde Google (lo que hay ahora en Google).
export interface CambioDeGoogle {
  clave: string; // "ev12", "se40"
  titulo: string;
  inicio: Date;
  fin: Date;
  lugar: string | null;
}

// Un cambio de Google que ya se pasó a Syntra (para avisarlo en la pantalla).
export interface CambioTraido {
  clave: string;
  titulo: string;
  antes: string; // ISO
  ahora: string; // ISO
}
