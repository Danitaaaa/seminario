// Llamadas a la API de Google Calendar. Solo trabaja sobre el calendario que creó la app.
const BASE = 'https://www.googleapis.com/calendar/v3';

export type FetchFn = typeof fetch;

export class ErrorCalendar extends Error {
  constructor(readonly estado: number, detalle: string) {
    super(`Google Calendar respondió ${estado}: ${detalle}`);
  }
}

// Lo que Syntra deja en cada evento de Google para saber si cambió.
export interface EventoExistente {
  id: string;
  huella: string | null;
}

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

  // Todos los eventos que Syntra dejó en el calendario (con su huella), de a páginas.
  async listarEventos(idCalendario: string): Promise<EventoExistente[]> {
    const eventos: EventoExistente[] = [];
    let pagina: string | undefined;
    do {
      const parametros = new URLSearchParams({
        maxResults: '2500',
        showDeleted: 'false',
        fields: 'items(id,extendedProperties),nextPageToken',
        ...(pagina ? { pageToken: pagina } : {}),
      });
      const datos = await this.pedir<{
        items?: { id: string; extendedProperties?: { private?: Record<string, string> } }[];
        nextPageToken?: string;
      }>('GET', `/calendars/${encodeURIComponent(idCalendario)}/events?${parametros}`);
      for (const item of datos.items ?? []) eventos.push({ id: item.id, huella: item.extendedProperties?.private?.huella ?? null });
      pagina = datos.nextPageToken;
    } while (pagina);
    return eventos;
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
