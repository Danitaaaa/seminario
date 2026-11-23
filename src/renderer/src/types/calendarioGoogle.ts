// Espejo de lo que devuelve el main (administracionDePersistencia/calendarioGoogle.ts).

// Un cambio hecho en Google que ya se pasó a Syntra.
export interface CambioTraido {
  clave: string; // "ev12" (evento) o "se40" (sesión de estudio)
  titulo: string;
  antes: string; // ISO
  ahora: string; // ISO
  cuando: string; // ISO: cuándo se trajo
}

export interface CalendarioVisible {
  id: string;
  nombre: string;
  color: string | null;
}

export interface EstadoCalendarioGoogle {
  conectado: boolean;
  correo: string | null;
  ultimaSincronizacion: string | null;
  reconectar: boolean; // el permiso de Google venció
  traerCambios: boolean;
  verOtros: boolean; // dio permiso para leer sus otros calendarios
  calendariosVisibles: CalendarioVisible[];
  ultimosCambios: CambioTraido[];
}

// Un evento de otro calendario de Google (se ve en Syntra, se edita en Google).
export interface EventoOtroCalendario {
  id: string;
  titulo: string;
  inicio: string; // ISO, o AAAA-MM-DD si es de todo el día
  fin: string;
  todoElDia: boolean;
  lugar: string | null;
  calendario: string;
  color: string | null;
}
