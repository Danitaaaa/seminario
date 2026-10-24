import type {
  EstadoPomodoro,
  EstadoSesionEstudio,
  FasePomodoro,
  SesionEstudio,
} from '../../types/sesionesEstudio';
import type { Direccion } from '../../types/vistaNodos';

// Texto que se muestra para cada estado (la lista y la pantalla de sesión usan el mismo).
export const ETIQUETA_ESTADO: Record<EstadoSesionEstudio, string> = {
  sin_empezar: 'Sin empezar',
  en_curso: 'En curso',
  atrasada: 'Atrasada',
  completada: 'Completada',
};

// Pestañas del panel Pomodoro (como en la referencia de diseño).
export const ETIQUETA_FASE: Record<FasePomodoro, string> = {
  pomodoro: 'Pomodoro',
  descanso_corto: 'Short Break',
  descanso_largo: 'Long Break',
};

// Campos por los que se puede ordenar la lista de sesiones.
export type OrdenSesiones =
  | 'nombre'
  | 'materia'
  | 'fecha_programada'
  | 'fecha_creacion'
  | 'fecha_ultimo_acceso'
  | 'estado';

const ORDEN_ESTADO: Record<EstadoSesionEstudio, number> = {
  en_curso: 0,
  atrasada: 1,
  sin_empezar: 2,
  completada: 3,
};

// Ordena una copia de la lista según el campo y la dirección elegidos.
export function ordenarSesiones(sesiones: SesionEstudio[], campo: OrdenSesiones, direccion: Direccion): SesionEstudio[] {
  const valor = (s: SesionEstudio): string | number => {
    switch (campo) {
      case 'nombre': return s.nombre.toLocaleLowerCase('es');
      case 'materia': return s.materiaAsociada.nombre.toLocaleLowerCase('es');
      case 'fecha_programada': return new Date(s.fechaProgramada).getTime();
      case 'fecha_creacion': return new Date(s.fechaCreacion).getTime();
      case 'fecha_ultimo_acceso': return new Date(s.fechaUltimoAcceso).getTime();
      case 'estado': return ORDEN_ESTADO[s.estado];
    }
  };
  const signo = direccion === 'ASC' ? 1 : -1;
  return [...sesiones].sort((a, b) => {
    const va = valor(a);
    const vb = valor(b);
    if (typeof va === 'string' && typeof vb === 'string') return signo * va.localeCompare(vb, 'es');
    return signo * ((va as number) - (vb as number));
  });
}

// Estado del Pomodoro calculado a partir de la sesión guardada (cuando todavía no llegó un tick del main).
export function estadoPomodoroDeSesion(sesion: SesionEstudio, ahoraMs: number = Date.now()): EstadoPomodoro {
  const { fase, restanteSeg, corriendoDesde, completados } = sesion.pomodoro;
  const segundosFase =
    (fase === 'pomodoro' ? sesion.pomodoroMin : fase === 'descanso_corto' ? sesion.descansoCortoMin : sesion.descansoLargoMin) * 60;
  const base = restanteSeg ?? segundosFase;
  const transcurridos = corriendoDesde
    ? Math.max(0, Math.floor((ahoraMs - new Date(corriendoDesde).getTime()) / 1000))
    : 0;
  return {
    fase,
    segundosFase,
    segundosRestantes: Math.max(0, base - transcurridos),
    corriendo: corriendoDesde !== null,
    pomodorosCompletados: completados,
  };
}

// Tiempo estudiado de una sesión ya finalizada (sin contar las pausas).
export function segundosEstudiados(sesion: SesionEstudio): number | null {
  if (!sesion.fechaInicio || !sesion.fechaFin) return null;
  const total = (new Date(sesion.fechaFin).getTime() - new Date(sesion.fechaInicio).getTime()) / 1000;
  return Math.max(0, total - sesion.segundosPausados);
}

// Electron envuelve el error real como "Error invoking remote method '...': Error: <mensaje>".
// Esto rescata el mensaje de negocio.
export function extraerMensajeError(err: unknown, generico: string): string {
  const texto = err instanceof Error ? err.message : String(err);
  const partes = texto.split('Error: ');
  return partes.length > 1 ? partes[partes.length - 1] : generico;
}

// Convierte una fecha ISO al formato que espera un input datetime-local (hora local).
export function aInputFechaHora(iso: string): string {
  const fecha = new Date(iso);
  const local = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

// Convierte el valor de un input datetime-local a ISO.
export function desdeInputFechaHora(valor: string): string {
  return new Date(valor).toISOString();
}

// Formatea segundos como mm:ss, o h:mm:ss si pasa de la hora.
export function formatearTiempo(segundos: number): string {
  const total = Math.max(0, Math.floor(segundos));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const seg = total % 60;
  const mm = String(minutos).padStart(2, '0');
  const ss = String(seg).padStart(2, '0');
  return horas > 0 ? `${horas}:${mm}:${ss}` : `${mm}:${ss}`;
}

// "Miércoles 10/09/2026 · 14:00 hs" (tarjeta Próxima sesión).
export function formatearDiaHora(iso: string): string {
  const fecha = new Date(iso);
  const dia = fecha.toLocaleDateString('es-AR', { weekday: 'long' });
  const fechaCorta = fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${fechaCorta} · ${hora} hs`;
}

// "Sábado, 24 de octubre" (cartel de bienvenida).
export function formatearFechaLarga(fecha: Date = new Date()): string {
  const texto = fecha.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
