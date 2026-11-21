import path from 'node:path';
import { ItemsParaCalendario } from '../logicaPersistente/gestionDeCalendarioGoogle/itemsParaCalendario';
import { OAuthDrive, SCOPE_CALENDAR, ErrorSinPermiso, type CredencialesOAuth } from '../logicaNoPersistente/drive/oauthDrive';
import { AlmacenTokensDrive, type Cifrador } from '../logicaNoPersistente/drive/almacenTokensDrive';
import { ClienteCalendar } from '../logicaNoPersistente/calendarioGoogle/clienteCalendar';
import { sincronizarCalendario, type ResultadoSincronizacion } from '../logicaNoPersistente/calendarioGoogle/sincronizarCalendario';
import { ConfigsCalendario } from '../logicaNoPersistente/calendarioGoogle/configCalendario';
import { usuarioSesionSync } from '../sesionSync';

export interface EstadoCalendarioGoogle {
  conectado: boolean;
  correo: string | null;
  ultimaSincronizacion: string | null;
  reconectar: boolean; // el permiso venció (en modo prueba, Google lo vence a los 7 días)
}

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

  constructor(
    private readonly items: ItemsParaCalendario,
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
      oauth = new OAuthDrive(this.credenciales, this.almacen(idUsuario), this.abrirNavegador, fetch, SCOPE_CALENDAR);
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
    };
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
      // Si el usuario borró el calendario en Google, se vuelve a crear.
      if (!idCalendario || !(await cliente.existeCalendario(idCalendario))) {
        idCalendario = await cliente.crearCalendario(NOMBRE_CALENDARIO, this.zonaHoraria());
      }
      const resultado = await sincronizarCalendario(cliente, idCalendario, await this.items.ejecutar(idUsuario), this.zonaHoraria());
      this.configs.guardar(idUsuario, {
        idCalendario,
        correo: oauth.cuenta() ?? config.correo,
        ultimaSincronizacion: new Date().toISOString(),
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
