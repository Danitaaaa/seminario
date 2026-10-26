import type { TipoNotificacion } from '../types/notificaciones';

const dosCifras = (n: number) => String(n).padStart(2, '0');

// "recién", "hace 5 min", "hace 3 h", "ayer", "21/10"
export function tiempoRelativo(fecha: Date, ahora: Date): string {
  const minutos = Math.floor((ahora.getTime() - fecha.getTime()) / 60_000);
  if (minutos < 1) return 'recién';
  if (minutos < 60) return `hace ${minutos} min`;
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  if (fecha >= inicioHoy) return `hace ${Math.floor(minutos / 60)} h`;
  const inicioAyer = new Date(inicioHoy);
  inicioAyer.setDate(inicioAyer.getDate() - 1);
  if (fecha >= inicioAyer) return 'ayer';
  return `${dosCifras(fecha.getDate())}/${dosCifras(fecha.getMonth() + 1)}`;
}

// A qué pantalla lleva tocar un aviso.
const RUTAS: Record<TipoNotificacion, string> = {
  evento: '/eventos',
  meta: '/dashboard',
  sesion: '/proximamente/sesiones',
  proyecto: '/proximamente/proyectos',
};

export const rutaDeNotificacion = (tipo: TipoNotificacion) => RUTAS[tipo] ?? '/dashboard';

// En el globito de la campanita: hasta 9, después "9+".
export const textoContador = (cantidad: number) => (cantidad > 9 ? '9+' : String(cantidad));