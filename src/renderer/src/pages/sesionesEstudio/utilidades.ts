import type { EstadoSesionEstudio } from '../../types/sesionesEstudio';

// Texto que se muestra para cada estado (la lista y la pantalla de sesión usan el mismo).
export const ETIQUETA_ESTADO: Record<EstadoSesionEstudio, string> = {
  sin_empezar: 'Sin empezar',
  en_curso: 'En curso',
  atrasada: 'Atrasada',
  completada: 'Completada',
};

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
