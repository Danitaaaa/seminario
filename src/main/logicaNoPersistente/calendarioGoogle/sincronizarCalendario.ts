import crypto from 'node:crypto';
import type { CambioDeGoogle, ItemCalendario } from '../../logicaPersistente/gestionDeCalendarioGoogle/entidades';
import type { ClienteCalendar, DatosEvento, EventoExistente } from './clienteCalendar';

export interface ResultadoSincronizacion {
  creadosOActualizados: number;
  borrados: number;
  traidos?: number; // cambios hechos en Google que se pasaron a Syntra
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
  // Además de la huella, cómo quedó subido: si después no coincide con lo que hay en Google, se editó allá.
  const privado = {
    syntra: '1',
    huella,
    tit: item.titulo,
    ini: item.todoElDia ? '' : String(item.inicio.getTime()),
    fin: item.todoElDia ? '' : String(item.fin.getTime()),
    lug: item.lugar ?? '',
  };
  return { ...cuerpo, extendedProperties: { private: privado } };
}

const huellaDe = (item: ItemCalendario, zonaHoraria: string) =>
  (aEventoGoogle(item, zonaHoraria).extendedProperties as { private: { huella: string } }).private.huella;

const iguales = (a: DatosEvento, b: DatosEvento) =>
  a.titulo === b.titulo && a.inicio === b.inicio && a.fin === b.fin && a.lugar === b.lugar;

// Compara lo que Syntra subió con lo que hay ahora en Google.
// - cambios: lo que se puede pasar a Syntra (eventos y sesiones que no cambiaron también en Syntra).
// - editados: todo lo que se tocó en Google. Lo que no se pase a Syntra se vuelve a subir como está en Syntra.
// Si cambió en los dos lados, gana Syntra.
export function cambiosEnGoogle(
  existentes: EventoExistente[],
  items: ItemCalendario[],
  zonaHoraria: string,
): { cambios: CambioDeGoogle[]; editados: Set<string> } {
  const porId = new Map(items.map((item) => [idGoogle(item.clave), item]));
  const cambios: CambioDeGoogle[] = [];
  const editados = new Set<string>();
  for (const e of existentes) {
    if (e.recurrente || !e.huella || !e.guardado || !e.google || iguales(e.guardado, e.google)) continue;
    editados.add(e.id);
    const item = porId.get(e.id);
    if (!item || item.semanal || item.todoElDia) continue; // clases y metas se cambian en Syntra
    if (!/^(ev|se)\d+$/.test(item.clave)) continue;
    if (huellaDe(item, zonaHoraria) !== e.huella) continue; // también cambió en Syntra: gana Syntra
    if (e.google.inicio === null || e.google.fin === null) continue; // lo pasaron a "todo el día"
    cambios.push({
      clave: item.clave,
      titulo: e.google.titulo.trim() || item.titulo,
      inicio: new Date(e.google.inicio),
      fin: new Date(e.google.fin),
      lugar: e.google.lugar.trim() || null,
    });
  }
  return { cambios, editados };
}

// Deja el calendario "Syntra" de Google igual a lo que hay en Syntra: crea lo nuevo, actualiza lo que
// cambió y borra lo que ya no está. Lo que no cambió no se toca (no gasta llamadas).
export async function sincronizarCalendario(
  cliente: ClienteCalendar,
  idCalendario: string,
  items: ItemCalendario[],
  zonaHoraria: string,
  opciones: { existentes?: EventoExistente[]; forzar?: Set<string> } = {},
): Promise<ResultadoSincronizacion> {
  // Los días sueltos de una clase que se movieron en Google los maneja Google: no se tocan.
  const lista = (opciones.existentes ?? (await cliente.listarEventos(idCalendario))).filter((e) => !e.recurrente);
  const existentes = new Map(lista.map((e) => [e.id, e.huella]));
  // Se vuelven a subir: lo editado en Google que no se pasó a Syntra, y lo subido sin los datos para comparar.
  const forzar = new Set(opciones.forzar ?? []);
  for (const e of lista) if (e.huella && e.guardado === null) forzar.add(e.id);
  const resultado: ResultadoSincronizacion = { creadosOActualizados: 0, borrados: 0, sinCambios: 0, fallidos: 0 };
  const deseados = new Set<string>();

  const tareas: (() => Promise<void>)[] = [];
  for (const item of items) {
    const id = idGoogle(item.clave);
    deseados.add(id);
    const evento = aEventoGoogle(item, zonaHoraria);
    const huella = (evento.extendedProperties as { private: { huella: string } }).private.huella;
    if (existentes.get(id) === huella && !forzar.has(id)) {
      resultado.sinCambios++;
      continue;
    }
    tareas.push(async () => {
      await cliente.guardarEvento(idCalendario, id, evento);
      resultado.creadosOActualizados++;
    });
  }
  for (const [id, huella] of existentes) {
    // Solo se borra lo que creó Syntra (lleva huella); lo que la persona cargó a mano en Google no se toca.
    if (deseados.has(id) || huella === null) continue;
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
