import path from 'node:path';
import crypto from 'node:crypto';
import { ItemsParaCalendario } from '../logicaPersistente/gestionDeCalendarioGoogle/itemsParaCalendario';
import { AplicarCambiosDeGoogle } from '../logicaPersistente/gestionDeCalendarioGoogle/aplicarCambiosDeGoogle';
import type { CambioTraido } from '../logicaPersistente/gestionDeCalendarioGoogle/entidades';
import { OAuthDrive, SCOPE_CALENDAR, SCOPE_CALENDAR_LECTURA, ErrorSinPermiso, conCuenta, type CredencialesOAuth } from '../logicaNoPersistente/drive/oauthDrive';
import { AlmacenTokensDrive, type Cifrador } from '../logicaNoPersistente/drive/almacenTokensDrive';
import { ClienteCalendar, ErrorCalendar, type CalendarioDeGoogle, type EventoExistente } from '../logicaNoPersistente/calendarioGoogle/clienteCalendar';
import { cambiosEnGoogle, idGoogle, sincronizarCalendario, type ResultadoSincronizacion } from '../logicaNoPersistente/calendarioGoogle/sincronizarCalendario';
import { ConfigsCalendario } from '../logicaNoPersistente/calendarioGoogle/configCalendario';
import { usuarioSesionSync } from '../sesionSync';

export interface EstadoCalendarioGoogle {
  conectado: boolean;
  correo: string | null;
  ultimaSincronizacion: string | null;
  reconectar: boolean; // el permiso venció (en modo prueba, Google lo vence a los 7 días)
  traerCambios: boolean;
  verOtros: boolean; // dio permiso para leer sus otros calendarios
  calendariosVisibles: { id: string; nombre: string; color: string | null }[];
  ultimosCambios: (CambioTraido & { cuando: string })[];
}

// Un evento de otro calendario de Google, para mostrar en el Calendario de Syntra (no se edita acá).
export interface EventoOtroCalendario {
  id: string; // solo sirve para abrirlo en Google
  titulo: string;
  inicio: string;
  fin: string;
  todoElDia: boolean;
  lugar: string | null;
  calendario: string;
  color: string | null;
}

const DIAS_CAMBIOS_RECIENTES = 7;
const MAX_CAMBIOS_RECIENTES = 20;

const NOMBRE_CALENDARIO = 'Syntra';

function usuarioActual(): number {
  const id = usuarioSesionSync();
  if (id == null) throw new Error('No hay una sesión iniciada.');
  return id;
}

// Punto de entrada a la copia de Syntra en Google Calendar (solo de Syntra hacia Google).
// Cada usuario de Syntra conecta su propia cuenta de Google; el permiso se guarda cifrado en esta compu.
export class CalendarioGoogle {
  private readonly oauths = new Map<number, OAuthDrive>();
  private readonly enCurso = new Map<number, Promise<ResultadoSincronizacion | null>>();
  private readonly venceron = new Set<number>();
  private readonly configs: ConfigsCalendario;
  // Enlaces de los eventos de otros calendarios que se mostraron (el renderer solo manda el id).
  private readonly enlaces = new Map<string, string>();

  constructor(
    private readonly items: ItemsParaCalendario,
    private readonly aplicarCambios: AplicarCambiosDeGoogle,
    private readonly carpeta: string,
    private readonly credenciales: CredencialesOAuth,
    private readonly cifrador: Cifrador,
    private readonly abrirNavegador: (url: string) => Promise<void>,
  ) {
    this.configs = new ConfigsCalendario(carpeta);
  }

  private almacen(idUsuario: number) {
    return new AlmacenTokensDrive(path.join(this.carpeta, `calendar-${idUsuario}.bin`), this.cifrador);
  }

  private oauth(idUsuario: number): OAuthDrive {
    let oauth = this.oauths.get(idUsuario);
    if (!oauth) {
      // Con permiso de lectura pide también ver los otros calendarios (al volver a conectar no se pierde).
      const scope = this.configs.leer(idUsuario).permisoLectura ? SCOPE_CALENDAR_LECTURA : SCOPE_CALENDAR;
      oauth = new OAuthDrive(this.credenciales, this.almacen(idUsuario), this.abrirNavegador, fetch, scope);
      this.oauths.set(idUsuario, oauth);
    }
    return oauth;
  }

  private zonaHoraria(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Argentina/Buenos_Aires';
  }

  async estado(): Promise<EstadoCalendarioGoogle> {
    const idUsuario = usuarioActual();
    const config = this.configs.leer(idUsuario);
    return {
      conectado: (await this.oauth(idUsuario).tienePermiso()) && config.idCalendario !== null,
      correo: config.correo,
      ultimaSincronizacion: config.ultimaSincronizacion,
      reconectar: this.venceron.has(idUsuario),
      traerCambios: config.traerCambios,
      verOtros: config.permisoLectura,
      calendariosVisibles: config.calendariosVisibles,
      ultimosCambios: config.ultimosCambios,
    };
  }

  // Prende o apaga traer a Syntra lo que se edite en Google.
  async configurar(traerCambios: boolean): Promise<EstadoCalendarioGoogle> {
    const idUsuario = usuarioActual();
    this.configs.guardar(idUsuario, { ...this.configs.leer(idUsuario), traerCambios });
    return this.estado();
  }

  // Pide a Google permiso para leer los otros calendarios (abre el navegador una vez).
  async permitirLectura(): Promise<EstadoCalendarioGoogle> {
    const idUsuario = usuarioActual();
    const config = this.configs.leer(idUsuario);
    this.configs.guardar(idUsuario, { ...config, permisoLectura: true });
    this.oauths.delete(idUsuario);
    try {
      await this.oauth(idUsuario).conectar();
    } catch (error) {
      this.configs.guardar(idUsuario, { ...this.configs.leer(idUsuario), permisoLectura: config.permisoLectura });
      this.oauths.delete(idUsuario);
      throw error;
    }
    this.venceron.delete(idUsuario);
    return this.estado();
  }

  // Los otros calendarios de la cuenta (sin el de Syntra), para elegir cuáles ver.
  async listarCalendarios(): Promise<CalendarioDeGoogle[]> {
    const idUsuario = usuarioActual();
    const config = this.configs.leer(idUsuario);
    if (!config.permisoLectura) return [];
    const lista = (await this.leerDeGoogle(idUsuario, (cliente) => cliente.listarCalendarios())).filter((c) => c.id !== config.idCalendario);
    // Si en Google cambió el nombre o el color de alguno de los elegidos, se actualiza.
    const visibles = lista.filter((c) => config.calendariosVisibles.some((v) => v.id === c.id));
    if (JSON.stringify(visibles) !== JSON.stringify(config.calendariosVisibles)) {
      this.configs.guardar(idUsuario, { ...this.configs.leer(idUsuario), calendariosVisibles: visibles });
    }
    return lista;
  }

  async elegirCalendarios(ids: string[]): Promise<EstadoCalendarioGoogle> {
    const idUsuario = usuarioActual();
    const elegidos = (await this.listarCalendarios()).filter((c) => ids.includes(c.id));
    this.configs.guardar(idUsuario, { ...this.configs.leer(idUsuario), calendariosVisibles: elegidos });
    return this.estado();
  }

  // Eventos de los otros calendarios elegidos, para el mes que se está mirando.
  async eventosOtros(desde: Date, hasta: Date): Promise<EventoOtroCalendario[]> {
    const idUsuario = usuarioActual();
    const config = this.configs.leer(idUsuario);
    if (!config.permisoLectura || config.calendariosVisibles.length === 0) return [];
    const resultado: EventoOtroCalendario[] = [];
    await this.leerDeGoogle(idUsuario, async (cliente) => {
      for (const cal of config.calendariosVisibles) {
        for (const e of await cliente.eventosEntre(cal.id, desde, hasta)) {
          const id = crypto.createHash('sha1').update(`${cal.id}|${e.id}`).digest('hex').slice(0, 20);
          if (e.enlace) this.enlaces.set(id, e.enlace);
          resultado.push({ id, titulo: e.titulo, inicio: e.inicio, fin: e.fin, todoElDia: e.todoElDia, lugar: e.lugar, calendario: cal.nombre, color: cal.color });
        }
      }
    });
    return resultado;
  }

  // Abre en el navegador un evento de otro calendario (solo los que se mostraron, y solo de Google).
  async abrirEvento(id: string): Promise<void> {
    const enlace = this.enlaces.get(id);
    if (!enlace || !new URL(enlace).hostname.endsWith('google.com')) throw new Error('No se encontró ese evento de Google.');
    const correo = this.configs.leer(usuarioActual()).correo;
    await this.abrirNavegador(conCuenta(enlace, correo));
  }

  // Lee de Google con el permiso de lectura; si Google no lo dio, lo avisa claro.
  private async leerDeGoogle<T>(idUsuario: number, leer: (cliente: ClienteCalendar) => Promise<T>): Promise<T> {
    const oauth = this.oauth(idUsuario);
    try {
      return await leer(new ClienteCalendar(() => oauth.obtenerAccessToken(false)));
    } catch (error) {
      if (error instanceof ErrorSinPermiso) {
        this.venceron.add(idUsuario);
        throw new Error('El permiso de Google venció. Tocá "Conectar" para darlo de nuevo.');
      }
      if (error instanceof ErrorCalendar && error.estado === 403) {
        this.configs.guardar(idUsuario, { ...this.configs.leer(idUsuario), permisoLectura: false, calendariosVisibles: [] });
        this.oauths.delete(idUsuario);
        throw new Error('Google no dio permiso para leer tus calendarios. Volvé a tocar "Ver otros calendarios" y aceptá el permiso.');
      }
      throw error;
    }
  }

  // Abre Google para dar el permiso, crea el calendario "Syntra" (si no existe) y copia todo.
  async conectar(): Promise<EstadoCalendarioGoogle> {
    if (!this.credenciales.clientId) throw new Error('Falta GOOGLE_CLIENT_ID en el .env.');
    const idUsuario = usuarioActual();
    const oauth = this.oauth(idUsuario);
    await oauth.conectar();
    this.venceron.delete(idUsuario);
    const config = this.configs.leer(idUsuario);
    this.configs.guardar(idUsuario, { ...config, correo: oauth.cuenta() ?? config.correo });
    await this.sincronizarUsuario(idUsuario, true);
    return this.estado();
  }

  // Desde la pantalla ("Sincronizar ahora"). Si el permiso venció, avisa que hay que reconectar.
  async sincronizar(): Promise<EstadoCalendarioGoogle> {
    const idUsuario = usuarioActual();
    await this.sincronizarUsuario(idUsuario, true);
    return this.estado();
  }

  // Cada tanto, en segundo plano: nunca abre el navegador ni muestra errores.
  async sincronizarEnSegundoPlano(): Promise<void> {
    const idUsuario = usuarioSesionSync();
    if (idUsuario == null || !(await this.oauth(idUsuario).tienePermiso())) return;
    await this.sincronizarUsuario(idUsuario, false).catch((error) => console.error('[Calendar] Falló la copia automática:', error));
  }

  private sincronizarUsuario(idUsuario: number, avisarErrores: boolean): Promise<ResultadoSincronizacion | null> {
    // Una sola copia a la vez por usuario.
    const previa = this.enCurso.get(idUsuario);
    if (previa) return previa;
    const tarea = this.copiar(idUsuario, avisarErrores).finally(() => this.enCurso.delete(idUsuario));
    this.enCurso.set(idUsuario, tarea);
    return tarea;
  }

  private async copiar(idUsuario: number, avisarErrores: boolean): Promise<ResultadoSincronizacion | null> {
    const oauth = this.oauth(idUsuario);
    const cliente = new ClienteCalendar(() => oauth.obtenerAccessToken(false));
    try {
      const config = this.configs.leer(idUsuario);
      let idCalendario = config.idCalendario;
      let existentes: EventoExistente[] = [];
      // Si el usuario borró el calendario en Google, se vuelve a crear.
      if (!idCalendario || !(await cliente.existeCalendario(idCalendario))) {
        idCalendario = await cliente.crearCalendario(NOMBRE_CALENDARIO, this.zonaHoraria());
      } else {
        existentes = await cliente.listarEventos(idCalendario);
      }

      // Primero se trae lo que se cambió en Google; lo que no se puede traer se vuelve a subir como está en Syntra.
      let items = await this.items.ejecutar(idUsuario);
      let traidos: CambioTraido[] = [];
      const { cambios, editados } = cambiosEnGoogle(existentes, items, this.zonaHoraria());
      if (config.traerCambios && cambios.length > 0) {
        traidos = await this.aplicarCambios.ejecutar(idUsuario, cambios);
        if (traidos.length > 0) items = await this.items.ejecutar(idUsuario);
      }
      const pasados = new Set(traidos.map((t) => idGoogle(t.clave)));
      const forzar = new Set([...editados].filter((id) => !pasados.has(id)));

      const resultado = await sincronizarCalendario(cliente, idCalendario, items, this.zonaHoraria(), { existentes, forzar });
      resultado.traidos = traidos.length;

      const ahora = new Date();
      const limite = ahora.getTime() - DIAS_CAMBIOS_RECIENTES * 86_400_000;
      const ultimosCambios = [...traidos.map((t) => ({ ...t, cuando: ahora.toISOString() })), ...config.ultimosCambios]
        .filter((c) => new Date(c.cuando).getTime() >= limite)
        .slice(0, MAX_CAMBIOS_RECIENTES);
      this.configs.guardar(idUsuario, {
        ...this.configs.leer(idUsuario),
        idCalendario,
        correo: oauth.cuenta() ?? config.correo,
        ultimaSincronizacion: ahora.toISOString(),
        ultimosCambios,
      });
      this.venceron.delete(idUsuario);
      return resultado;
    } catch (error) {
      if (error instanceof ErrorSinPermiso) {
        this.venceron.add(idUsuario);
        if (avisarErrores) throw new Error('El permiso de Google venció. Tocá "Conectar" para darlo de nuevo.');
        return null;
      }
      if (avisarErrores) throw error;
      return null;
    }
  }

  // Borra el calendario "Syntra" de Google (si se puede) y olvida el permiso de esta compu.
  async desconectar(): Promise<EstadoCalendarioGoogle> {
    const idUsuario = usuarioActual();
    const config = this.configs.leer(idUsuario);
    const oauth = this.oauth(idUsuario);
    if (config.idCalendario && (await oauth.tienePermiso())) {
      await new ClienteCalendar(() => oauth.obtenerAccessToken(false))
        .borrarCalendario(config.idCalendario)
        .catch((error) => console.error('[Calendar] No se pudo borrar el calendario de Google:', error));
    }
    await this.almacen(idUsuario).borrar();
    this.configs.borrar(idUsuario);
    this.oauths.delete(idUsuario);
    this.venceron.delete(idUsuario);
    return this.estado();
  }

  cancelarConexion(): void {
    const idUsuario = usuarioSesionSync();
    if (idUsuario != null) this.oauths.get(idUsuario)?.cancelar();
  }
}
