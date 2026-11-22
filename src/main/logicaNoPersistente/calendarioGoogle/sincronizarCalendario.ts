import crypto from 'node:crypto';
import type { ItemCalendario } from '../../logicaPersistente/gestionDeCalendarioGoogle/entidades';
import type { ClienteCalendar } from './clienteCalendar';

export interface ResultadoSincronizacion {
  creadosOActualizados: number;
  borrados: number;
  sinCambios: number;
  fallidos: number;
}

// Google pide ids con letras de la "a" a la "v" y números, de al menos 5 caracteres.
export const idGoogle = (clave: string) => `sntr${clave}`;

const fechaLocal = (f: Date) => `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;

// Formatos de RFC 5545 para la repetición: UNTIL en UTC y EXDATE en hora local de la zona.
const utcBasico = (f: Date) => f.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const dosCifras = (n: number) => String(n).padStart(2, '0');
const localBasico = (f: Date) =>
  `${f.getFullYear()}${dosCifras(f.getMonth() + 1)}${dosCifras(f.getDate())}T${dosCifras(f.getHours())}${dosCifras(f.getMinutes())}00`;

// Clases: cada semana hasta el fin de la cursada, sin los días de feriados y recesos.
function repeticion(item: ItemCalendario, zonaHoraria: string): string[] {
  const regla = `RRULE:FREQ=WEEKLY${item.hasta ? `;UNTIL=${utcBasico(item.hasta)}` : ''}`;
  if (!item.excepciones?.length) return [regla];
  return [regla, `EXDATE;TZID=${zonaHoraria}:${item.excepciones.map(localBasico).join(',')}`];
}

// Un elemento de Syntra como evento de Google. La huella resume el contenido: si no cambió, no se vuelve a subir.
export function aEventoGoogle(item: ItemCalendario, zonaHoraria: string): Record<string, unknown> {
  const cuerpo: Record<string, unknown> = {
    summary: item.titulo,
    description: item.descripcion,
    ...(item.lugar ? { location: item.lugar } : {}),
    ...(item.color ? { colorId: item.color } : {}),
    start: item.todoElDia ? { date: fechaLocal(item.inicio) } : { dateTime: item.inicio.toISOString(), timeZone: zonaHoraria },
    end: item.todoElDia ? { date: fechaLocal(item.fin) } : { dateTime: item.fin.toISOString(), timeZone: zonaHoraria },
    ...(item.semanal ? { recurrence: repeticion(item, zonaHoraria) } : {}),
    // Sin recordatorios de Google: los avisos los da Syntra (si no, llegan dos veces).
    reminders: { useDefault: false, overrides: [] },
  };
  const huella = crypto.createHash('sha1').update(JSON.stringify(cuerpo)).digest('hex').slice(0, 16);
  return { ...cuerpo, extendedProperties: { private: { syntra: '1', huella } } };
}

// Deja el calendario "Syntra" de Google igual a lo que hay en Syntra: crea lo nuevo, actualiza lo que
// cambió y borra lo que ya no está. Lo que no cambió no se toca (no gasta llamadas).
export async function sincronizarCalendario(
  cliente: ClienteCalendar,
  idCalendario: string,
  items: ItemCalendario[],
  zonaHoraria: string,
): Promise<ResultadoSincronizacion> {
  const existentes = new Map((await cliente.listarEventos(idCalendario)).map((e) => [e.id, e.huella]));
  const resultado: ResultadoSincronizacion = { creadosOActualizados: 0, borrados: 0, sinCambios: 0, fallidos: 0 };
  const deseados = new Set<string>();

  const tareas: (() => Promise<void>)[] = [];
  for (const item of items) {
    const id = idGoogle(item.clave);
    deseados.add(id);
    const evento = aEventoGoogle(item, zonaHoraria);
    const huella = (evento.extendedProperties as { private: { huella: string } }).private.huella;
    if (existentes.get(id) === huella) {
      resultado.sinCambios++;
      continue;
    }
    tareas.push(async () => {
      await cliente.guardarEvento(idCalendario, id, evento);
      resultado.creadosOActualizados++;
    });
  }
  for (const id of existentes.keys()) {
    if (deseados.has(id)) continue;
    tareas.push(async () => {
      await cliente.borrarEvento(idCalendario, id);
      resultado.borrados++;
    });
  }

  // De a 4 a la vez: rápido, sin pasarse de los límites de Google.
  let siguiente = 0;
  const trabajador = async () => {
    while (siguiente < tareas.length) {
      const tarea = tareas[siguiente++];
      try {
        await tarea();
      } catch (error) {
        resultado.fallidos++;
        console.error('[Calendar] No se pudo copiar un evento:', error);
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, trabajador));
  return resultado;
}
