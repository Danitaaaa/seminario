import type { HorarioCursado } from '../types/horarios';
import type { Evento } from '../types/eventos';
import type { Meta } from '../types/metas';

export type TipoTarjeta = 'clase' | 'evento' | 'metas';

// Una tarjeta del carrusel del banner de inicio.
export interface Tarjeta {
  tipo: TipoTarjeta;
  etiqueta: string;
  titulo: string;
  detalle: string;
}

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MS_DIA = 24 * 60 * 60 * 1000;

const minutos = (hora: string) => {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
};

const inicioDelDia = (fecha: Date) =>
  new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime();

// "Sábado 24 de octubre"
export function fechaLarga(fecha: Date): string {
  return `${DIAS[fecha.getDay()]} ${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
}

// "Buenos días" hasta las 12, "Buenas tardes" hasta las 20 y después "Buenas noches".
export function saludoSegunHora(fecha: Date): string {
  const hora = fecha.getHours();
  if (hora >= 6 && hora < 12) return 'Buenos días';
  if (hora >= 12 && hora < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

// "Hoy", "Mañana", el nombre del día si cae esta semana, o "29 de octubre".
export function textoDia(fecha: Date, ahora: Date): string {
  const dias = Math.round((inicioDelDia(fecha) - inicioDelDia(ahora)) / MS_DIA);
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  if (dias > 1 && dias < 7) return DIAS[fecha.getDay()];
  return `${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
}

// La clase que está en curso o la siguiente de la semana.
export function proximaClase(horarios: HorarioCursado[], ahora: Date): Tarjeta | null {
  const hoy = ahora.getDay();
  const minutoActual = ahora.getHours() * 60 + ahora.getMinutes();
  let mejor: { horario: HorarioCursado; dias: number; enCurso: boolean; orden: number } | null = null;

  for (const horario of horarios) {
    const inicio = minutos(horario.horaInicio);
    const fin = minutos(horario.horaFin);
    let dias = (horario.diaSemana - hoy + 7) % 7;
    if (dias === 0 && minutoActual >= fin) dias = 7; // ya terminó: la próxima es en una semana
    const enCurso = dias === 0 && minutoActual >= inicio;
    const orden = dias * 1440 + (enCurso ? minutoActual : inicio);
    if (!mejor || orden < mejor.orden) mejor = { horario, dias, enCurso, orden };
  }
  if (!mejor) return null;

  const { horario, dias, enCurso } = mejor;
  const dia = new Date(ahora);
  dia.setDate(ahora.getDate() + dias);
  return {
    tipo: 'clase',
    etiqueta: enCurso ? 'Clase en curso' : 'Próxima clase',
    titulo: horario.titulo,
    detalle: enCurso
      ? `Ahora, hasta las ${horario.horaFin.slice(0, 5)}`
      : `${textoDia(dia, ahora)}, ${horario.horaInicio.slice(0, 5)}`,
  };
}

// El primer evento que todavía no pasó.
export function proximoEvento(eventos: Evento[], ahora: Date): Tarjeta | null {
  const futuros = eventos
    .map((evento) => ({ evento, fecha: new Date(evento.fecha) }))
    .filter(({ fecha }) => fecha.getTime() >= ahora.getTime())
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  if (futuros.length === 0) return null;

  const { evento, fecha } = futuros[0];
  const hora = `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
  // Un evento a las 00:00 se toma como "todo el día": se muestra solo la fecha.
  const detalle = hora === '00:00' ? textoDia(fecha, ahora) : `${textoDia(fecha, ahora)}, ${hora}`;
  return { tipo: 'evento', etiqueta: 'Próximo evento', titulo: evento.titulo, detalle };
}

// Cuántas metas quedan sin tachar y cuál sigue.
export function resumenMetas(metas: Meta[]): Tarjeta | null {
  if (metas.length === 0) return null;
  const pendientes = metas.filter((meta) => !meta.completada);
  if (pendientes.length === 0) {
    return { tipo: 'metas', etiqueta: 'Mis metas', titulo: '¡Todas tachadas!', detalle: `${metas.length} de ${metas.length} cumplidas` };
  }
  return {
    tipo: 'metas',
    etiqueta: 'Metas pendientes',
    titulo: `${pendientes.length} de ${metas.length} sin tachar`,
    detalle: `Sigue: ${pendientes[0].titulo}`,
  };
}