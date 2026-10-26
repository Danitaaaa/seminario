import type { HorarioCursado } from '../types/horarios';
import type { Evento } from '../types/eventos';
import type { Meta } from '../types/metas';

export type TipoBloque = 'clase' | 'evento';

// Algo con horario dentro de un día. desde y hasta son minutos desde las 00:00.
export interface Bloque {
  id: number;
  tipo: TipoBloque;
  titulo: string;
  detalle: string;
  desde: number;
  hasta: number;
}

// Un bloque ya ubicado: si se superpone con otros, comparte el ancho en columnas.
export interface BloqueUbicado extends Bloque {
  columna: number;
  columnas: number;
}

export interface DiaCronograma {
  fecha: Date;
  iso: string;
  bloques: BloqueUbicado[];
  metas: Meta[];
  eventosTodoElDia: Evento[];
}

// Un evento solo tiene fecha y hora de inicio: se muestra como un bloque de una hora.
const MINUTOS_EVENTO = 60;
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre'];

const dosCifras = (n: number) => String(n).padStart(2, '0');
const aMinutos = (hora: string) => {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
};
export const textoHora = (minutos: number) => `${dosCifras(Math.floor(minutos / 60))}:${dosCifras(minutos % 60)}`;

export function fechaISO(fecha: Date): string {
  return `${fecha.getFullYear()}-${dosCifras(fecha.getMonth() + 1)}-${dosCifras(fecha.getDate())}`;
}

export function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + dias);
}

// La semana arranca el lunes.
export function inicioDeSemana(fecha: Date): Date {
  const corrimiento = (fecha.getDay() + 6) % 7;
  return sumarDias(fecha, -corrimiento);
}

// "19 – 25 de octubre" o "26 de octubre – 1 de noviembre".
export function tituloSemana(inicio: Date): string {
  const fin = sumarDias(inicio, 6);
  if (inicio.getMonth() === fin.getMonth()) {
    return `${inicio.getDate()} – ${fin.getDate()} de ${MESES[fin.getMonth()]}`;
  }
  return `${inicio.getDate()} de ${MESES[inicio.getMonth()]} – ${fin.getDate()} de ${MESES[fin.getMonth()]}`;
}

const esTodoElDia = (fecha: Date) => fecha.getHours() === 0 && fecha.getMinutes() === 0;

// Reparte en columnas los bloques que se pisan, para que se vean uno al lado del otro.
export function ubicarSuperpuestos(bloques: Bloque[]): BloqueUbicado[] {
  const ordenados = [...bloques].sort((a, b) => a.desde - b.desde || b.hasta - a.hasta);
  const resultado: BloqueUbicado[] = [];
  let grupo: BloqueUbicado[] = [];
  let finDelGrupo = -1;

  const cerrarGrupo = () => {
    const columnas = Math.max(...grupo.map((b) => b.columna)) + 1;
    grupo.forEach((b) => resultado.push({ ...b, columnas }));
    grupo = [];
  };

  for (const bloque of ordenados) {
    if (grupo.length > 0 && bloque.desde >= finDelGrupo) cerrarGrupo();
    const ocupadas = grupo.filter((b) => b.hasta > bloque.desde).map((b) => b.columna);
    let columna = 0;
    while (ocupadas.includes(columna)) columna++;
    grupo.push({ ...bloque, columna, columnas: 1 });
    finDelGrupo = grupo.length === 1 ? bloque.hasta : Math.max(finDelGrupo, bloque.hasta);
  }
  if (grupo.length > 0) cerrarGrupo();
  return resultado;
}

// Arma los 7 días de la semana con sus clases, eventos y metas.
export function armarSemana(inicio: Date, horarios: HorarioCursado[], eventos: Evento[], metas: Meta[]): DiaCronograma[] {
  return Array.from({ length: 7 }, (_, i) => {
    const fecha = sumarDias(inicio, i);
    const iso = fechaISO(fecha);

    const clases: Bloque[] = horarios
      .filter((h) => h.diaSemana === fecha.getDay())
      .map((h) => ({
        id: h.id,
        tipo: 'clase',
        titulo: h.titulo,
        detalle: `${h.horaInicio.slice(0, 5)} – ${h.horaFin.slice(0, 5)}`,
        desde: aMinutos(h.horaInicio),
        hasta: aMinutos(h.horaFin),
      }));

    const delDia = eventos.filter((e) => fechaISO(new Date(e.fecha)) === iso);
    const conHora: Bloque[] = delDia
      .filter((e) => !esTodoElDia(new Date(e.fecha)))
      .map((e) => {
        const momento = new Date(e.fecha);
        const desde = momento.getHours() * 60 + momento.getMinutes();
        return {
          id: e.id,
          tipo: 'evento',
          titulo: e.titulo,
          detalle: e.lugar ? `${textoHora(desde)} · ${e.lugar}` : textoHora(desde),
          desde,
          hasta: Math.min(desde + MINUTOS_EVENTO, 24 * 60),
        };
      });

    return {
      fecha,
      iso,
      bloques: ubicarSuperpuestos([...clases, ...conHora]),
      metas: metas.filter((m) => m.fechaLimite === iso),
      eventosTodoElDia: delDia.filter((e) => esTodoElDia(new Date(e.fecha))),
    };
  });
}

// De 8 a 20 hs, salvo que haya algo antes o después: entonces se amplía a la hora entera.
export function rangoDeHoras(dias: DiaCronograma[]): { desde: number; hasta: number } {
  let desde = 8 * 60;
  let hasta = 20 * 60;
  for (const dia of dias) {
    for (const bloque of dia.bloques) {
      desde = Math.min(desde, Math.floor(bloque.desde / 60) * 60);
      hasta = Math.max(hasta, Math.ceil(bloque.hasta / 60) * 60);
    }
  }
  return { desde, hasta };
}