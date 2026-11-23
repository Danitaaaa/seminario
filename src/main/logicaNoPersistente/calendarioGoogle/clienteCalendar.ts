// Llamadas a la API de Google Calendar. Solo trabaja sobre el calendario que creó la app.
const BASE = 'https://www.googleapis.com/calendar/v3';

export type FetchFn = typeof fetch;

export class ErrorCalendar extends Error {
  constructor(readonly estado: number, detalle: string) {
    super(`Google Calendar respondió ${estado}: ${detalle}`);
  }
}

// Lo que Syntra deja en cada evento de Google para saber si cambió.
// "guardado" es cómo lo subió Syntra y "google" cómo está ahora: si no coinciden, se editó en Google.
export interface DatosEvento {
  titulo: string;
  inicio: number | null; // milisegundos; null en los de todo el día
  fin: number | null;
  lugar: string;
}

export interface EventoExistente {
  id: string;
  huella: string | null;
  recurrente?: boolean; // un día de una clase que se movió solo en Google (lo maneja Google)
  google?: DatosEvento;
  guardado?: DatosEvento | null; // null: lo subió una versión vieja de Syntra, sin estos datos
}

// Un calendario de la cuenta de Google (para ver sus eventos en Syntra).
export interface CalendarioDeGoogle {
  id: string;
  nombre: string;
  color: string | null;
}

// Un evento de otro calendario de Google, que se muestra en Syntra sin poder editarlo.
export interface EventoDeGoogle {
  id: string;
  titulo: string;
  inicio: string; // ISO, o AAAA-MM-DD si es de todo el día
  fin: string;
  todoElDia: boolean;
  lugar: string | null;
  enlace: string | null;
}

type HoraGoogle = { dateTime?: string; date?: string };
const milisegundos = (h?: HoraGoogle) => (h?.dateTime ? new Date(h.dateTime).getTime() : null);
const numero = (texto?: string) => (texto && /^\d+$/.test(texto) ? Number(texto) : null);

export class ClienteCalendar {
  constructor(
    private readonly token: () => Promise<string>,
    private readonly fetchFn: FetchFn = fetch,
  ) {}

  private async pedir<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
    const respuesta = await this.fetchFn(`${BASE}${ruta}`, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${await this.token()}`,
        ...(cuerpo ? { 'Content-Type': 'application/json' } : {}),
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    if (!respuesta.ok) {
      const texto = await respuesta.text().catch(() => '');
      throw new ErrorCalendar(respuesta.status, texto.slice(0, 300));
    }
    return (respuesta.status === 204 ? undefined : await respuesta.json()) as T;
  }

  async crearCalendario(nombre: string, zonaHoraria: string): Promise<string> {
    const creado = await this.pedir<{ id: string }>('POST', '/calendars', {
      summary: nombre,
      description: 'Eventos, parciales, sesiones de estudio y clases de Syntra. Se actualiza solo desde la app.',
      timeZone: zonaHoraria,
    });
    return creado.id;
  }

  async existeCalendario(id: string): Promise<boolean> {
    try {
      await this.pedir('GET', `/calendars/${encodeURIComponent(id)}`);
      return true;
    } catch (error) {
      if (error instanceof ErrorCalendar && (error.estado === 404 || error.estado === 410)) return false;
      throw error;
    }
  }

  async borrarCalendario(id: string): Promise<void> {
    await this.pedir('DELETE', `/calendars/${encodeURIComponent(id)}`);
  }

  // Todos los eventos del calendario "Syntra", con su huella y cómo están ahora en Google, de a páginas.
  async listarEventos(idCalendario: string): Promise<EventoExistente[]> {
    const eventos: EventoExistente[] = [];
    let pagina: string | undefined;
    do {
      const parametros = new URLSearchParams({
        maxResults: '2500',
        showDeleted: 'false',
        fields: 'items(id,recurringEventId,summary,location,start,end,extendedProperties),nextPageToken',
        ...(pagina ? { pageToken: pagina } : {}),
      });
      const datos = await this.pedir<{
        items?: {
          id: string;
          recurringEventId?: string;
          summary?: string;
          location?: string;
          start?: HoraGoogle;
          end?: HoraGoogle;
          extendedProperties?: { private?: Record<string, string> };
        }[];
        nextPageToken?: string;
      }>('GET', `/calendars/${encodeURIComponent(idCalendario)}/events?${parametros}`);
      for (const item of datos.items ?? []) {
        const privado = item.extendedProperties?.private ?? {};
        eventos.push({
          id: item.id,
          huella: privado.huella ?? null,
          recurrente: Boolean(item.recurringEventId),
          google: { titulo: item.summary ?? '', inicio: milisegundos(item.start), fin: milisegundos(item.end), lugar: item.location ?? '' },
          guardado: privado.tit === undefined
            ? null
            : { titulo: privado.tit, inicio: numero(privado.ini), fin: numero(privado.fin), lugar: privado.lug ?? '' },
        });
      }
      pagina = datos.nextPageToken;
    } while (pagina);
    return eventos;
  }

  // Los calendarios de la cuenta (necesita el permiso de lectura).
  async listarCalendarios(): Promise<CalendarioDeGoogle[]> {
    const datos = await this.pedir<{ items?: { id: string; summary?: string; summaryOverride?: string; backgroundColor?: string; primary?: boolean }[] }>(
      'GET',
      '/users/me/calendarList?fields=items(id,summary,summaryOverride,backgroundColor,primary)',
    );
    // Google le pone al calendario principal el mail como nombre: se muestra "Principal".
    return (datos.items ?? []).map((c) => ({
      id: c.id,
      nombre: c.primary ? 'Principal' : c.summaryOverride ?? c.summary ?? c.id,
      color: c.backgroundColor ?? null,
    }));
  }

  // Eventos de un calendario entre dos fechas, con las repeticiones ya separadas en días.
  async eventosEntre(idCalendario: string, desde: Date, hasta: Date): Promise<EventoDeGoogle[]> {
    const parametros = new URLSearchParams({
      timeMin: desde.toISOString(),
      timeMax: hasta.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '500',
      fields: 'items(id,status,summary,location,start,end,htmlLink)',
    });
    const datos = await this.pedir<{
      items?: { id: string; status?: string; summary?: string; location?: string; start?: HoraGoogle; end?: HoraGoogle; htmlLink?: string }[];
    }>('GET', `/calendars/${encodeURIComponent(idCalendario)}/events?${parametros}`);
    return (datos.items ?? [])
      .filter((e) => e.status !== 'cancelled' && (e.start?.dateTime || e.start?.date))
      .map((e) => ({
        id: e.id,
        titulo: e.summary ?? '(Sin título)',
        inicio: e.start?.dateTime ?? e.start?.date ?? '',
        fin: e.end?.dateTime ?? e.end?.date ?? '',
        todoElDia: !e.start?.dateTime,
        lugar: e.location ?? null,
        enlace: e.htmlLink ?? null,
      }));
  }

  // Crea o reemplaza el evento con ese id (el id lo elige Syntra, así no se duplica).
  async guardarEvento(idCalendario: string, id: string, evento: Record<string, unknown>): Promise<void> {
    const ruta = `/calendars/${encodeURIComponent(idCalendario)}/events`;
    try {
      await this.pedir('PUT', `${ruta}/${id}`, { ...evento, status: 'confirmed' });
    } catch (error) {
      if (!(error instanceof ErrorCalendar && error.estado === 404)) throw error;
      await this.pedir('POST', ruta, { ...evento, id });
    }
  }

  async borrarEvento(idCalendario: string, id: string): Promise<void> {
    try {
      await this.pedir('DELETE', `/calendars/${encodeURIComponent(idCalendario)}/events/${id}`);
    } catch (error) {
      // Ya no estaba: no hay nada que hacer.
      if (!(error instanceof ErrorCalendar && (error.estado === 404 || error.estado === 410))) throw error;
    }
  }
}
