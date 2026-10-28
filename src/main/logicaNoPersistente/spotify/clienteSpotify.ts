import { safeStorage } from 'electron';
import { CuentasSpotify } from '../../administracionDePersistencia/spotify';
import { AutenticacionSpotify, ConfiguracionSpotify, URL_TOKEN } from './autenticacionSpotify';

const API = 'https://api.spotify.com/v1';
// Se renueva el token un minuto antes de que venza.
const MARGEN_RENOVACION_MS = 60 * 1000;

// Lo que muestra el reproductor: pista actual, contexto (playlist/álbum) y dispositivo.
export interface EstadoReproduccionSpotify {
  reproduciendo: boolean;
  progresoMs: number;
  dispositivo: { id: string | null; nombre: string } | null;
  pista: {
    uri: string;
    nombre: string;
    artistas: string;
    album: string;
    imagen: string | null;
    duracionMs: number;
    numero: number;
  } | null;
  contexto: { uri: string; nombre: string; subtitulo: string } | null;
}

export interface EstadoCuentaSpotify {
  configurado: boolean;
  vinculada: boolean;
}

// Cliente de Spotify en el main: guarda la cuenta, renueva los tokens y habla con la Web API.
// La música suena en el Spotify del usuario; la app solo la controla. El renderer nunca ve los tokens.
export class ClienteSpotify {
  private tokens = new Map<number, { accessToken: string; venceMs: number }>();
  private contextos = new Map<string, { nombre: string; subtitulo: string }>();

  constructor(
    private readonly cuentas: CuentasSpotify,
    private readonly config: ConfiguracionSpotify,
    private readonly autenticacion: AutenticacionSpotify
  ) {}

  async estadoCuenta(idUsuario: number): Promise<EstadoCuentaSpotify> {
    if (!this.config.clientId) return { configurado: false, vinculada: false };
    return { configurado: true, vinculada: (await this.cuentas.obtener(idUsuario)) !== null };
  }

  // Abre el login de Spotify y guarda la cuenta (refresh token cifrado con las credenciales del sistema).
  async vincular(idUsuario: number): Promise<void> {
    this.verificarConfiguracion();
    const tokens = await this.autenticacion.autorizar();
    await this.guardarRefreshToken(idUsuario, tokens.refreshToken, tokens.alcances);
    this.tokens.set(idUsuario, {
      accessToken: tokens.accessToken,
      venceMs: Date.now() + tokens.expiraEnSeg * 1000,
    });
  }

  async desvincular(idUsuario: number): Promise<void> {
    this.tokens.delete(idUsuario);
    await this.cuentas.eliminar(idUsuario);
  }

  // Access token vigente para las llamadas a la API (se renueva solo).
  private async obtenerToken(idUsuario: number): Promise<string> {
    const actual = this.tokens.get(idUsuario);
    if (actual && actual.venceMs - MARGEN_RENOVACION_MS > Date.now()) return actual.accessToken;
    return this.renovar(idUsuario);
  }

  async estadoReproduccion(idUsuario: number): Promise<EstadoReproduccionSpotify | null> {
    const datos = await this.api(idUsuario, 'GET', '/me/player?additional_types=track');
    if (!datos || !datos.item) {
      return datos?.device
        ? { reproduciendo: false, progresoMs: 0, dispositivo: this.dispositivo(datos.device), pista: null, contexto: null }
        : null;
    }
    const item = datos.item;
    return {
      reproduciendo: Boolean(datos.is_playing),
      progresoMs: datos.progress_ms ?? 0,
      dispositivo: datos.device ? this.dispositivo(datos.device) : null,
      pista: {
        uri: item.uri,
        nombre: item.name,
        artistas: (item.artists ?? []).map((a: any) => a.name).join(', '),
        album: item.album?.name ?? '',
        imagen: item.album?.images?.[0]?.url ?? null,
        duracionMs: item.duration_ms ?? 0,
        numero: item.track_number ?? 0,
      },
      contexto: datos.context?.uri ? await this.contexto(idUsuario, datos.context.uri) : null,
    };
  }

  async reproducir(idUsuario: number, idDispositivo?: string): Promise<void> {
    await this.api(idUsuario, 'PUT', `/me/player/play${this.paramDispositivo(idDispositivo)}`);
  }

  async pausar(idUsuario: number, idDispositivo?: string): Promise<void> {
    await this.api(idUsuario, 'PUT', `/me/player/pause${this.paramDispositivo(idDispositivo)}`);
  }

  async siguiente(idUsuario: number, idDispositivo?: string): Promise<void> {
    await this.api(idUsuario, 'POST', `/me/player/next${this.paramDispositivo(idDispositivo)}`);
  }

  async anterior(idUsuario: number, idDispositivo?: string): Promise<void> {
    await this.api(idUsuario, 'POST', `/me/player/previous${this.paramDispositivo(idDispositivo)}`);
  }

  // "Guardado en Spotify": si la pista está en la biblioteca del usuario.
  async estaGuardada(idUsuario: number, uri: string): Promise<boolean> {
    const datos = await this.api(idUsuario, 'GET', `/me/library/contains?uris=${encodeURIComponent(uri)}`);
    return Array.isArray(datos) && datos[0] === true;
  }

  // ---- Internos ----

  private verificarConfiguracion(): void {
    if (!this.config.clientId) {
      throw new Error('Falta configurar SPOTIFY_CLIENT_ID en el archivo .env.');
    }
  }

  private async renovar(idUsuario: number): Promise<string> {
    this.verificarConfiguracion();
    const cuenta = await this.cuentas.obtener(idUsuario);
    if (!cuenta) throw new Error('Vinculá tu cuenta de Spotify.');

    const refreshToken = cuenta.cifrado
      ? safeStorage.decryptString(Buffer.from(cuenta.refreshToken, 'base64'))
      : cuenta.refreshToken;

    const respuesta = await fetch(URL_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.config.clientId,
      }),
    });
    if (!respuesta.ok) {
      // El usuario revocó el acceso desde Spotify: hay que volver a vincular.
      if (respuesta.status === 400) await this.desvincular(idUsuario);
      throw new Error('La sesión de Spotify venció. Volvé a vincular tu cuenta.');
    }
    const datos: any = await respuesta.json();
    // Spotify puede rotar el refresh token: si llega uno nuevo, se guarda.
    if (datos.refresh_token && datos.refresh_token !== refreshToken) {
      await this.guardarRefreshToken(idUsuario, datos.refresh_token, datos.scope ?? cuenta.alcances);
    }
    this.tokens.set(idUsuario, {
      accessToken: datos.access_token,
      venceMs: Date.now() + datos.expires_in * 1000,
    });
    return datos.access_token;
  }

  private async guardarRefreshToken(idUsuario: number, refreshToken: string, alcances: string): Promise<void> {
    const cifrar = safeStorage.isEncryptionAvailable();
    await this.cuentas.guardar({
      idUsuario,
      refreshToken: cifrar ? safeStorage.encryptString(refreshToken).toString('base64') : refreshToken,
      cifrado: cifrar,
      alcances,
    });
  }

  // Llamada a la Web API con el token vigente. Reintenta una vez si el token venció.
  private async api(idUsuario: number, metodo: string, ruta: string, cuerpo?: unknown, reintento = true): Promise<any> {
    const token = await this.obtenerToken(idUsuario);
    const respuesta = await fetch(`${API}${ruta}`, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });

    if (respuesta.status === 401 && reintento) {
      this.tokens.delete(idUsuario);
      return this.api(idUsuario, metodo, ruta, cuerpo, false);
    }
    if (respuesta.status === 204 || respuesta.status === 202) return null;
    if (!respuesta.ok) throw new Error(await this.mensajeError(respuesta));

    // Algunas órdenes (play, pausa, siguiente) responden 200 con un texto que no es JSON: se ignora.
    const texto = await respuesta.text();
    if (!texto) return null;
    try {
      return JSON.parse(texto);
    } catch {
      return null;
    }
  }

  private async mensajeError(respuesta: Response): Promise<string> {
    if (respuesta.status === 404) return 'No hay ningún Spotify activo. Abrí Spotify en tu PC o celular y reproducí algo.';
    if (respuesta.status === 403) return 'Spotify no permitió la acción (los controles requieren Spotify Premium).';
    if (respuesta.status === 429) return 'Demasiadas solicitudes a Spotify. Esperá unos segundos.';
    try {
      const datos: any = await respuesta.json();
      return datos?.error?.message ?? 'Spotify no respondió correctamente.';
    } catch {
      return 'Spotify no respondió correctamente.';
    }
  }

  private paramDispositivo(idDispositivo?: string): string {
    return idDispositivo ? `?device_id=${encodeURIComponent(idDispositivo)}` : '';
  }

  private dispositivo(device: any): { id: string | null; nombre: string } {
    return { id: device.id ?? null, nombre: device.name ?? 'Spotify' };
  }

  // Nombre de la playlist o álbum que se está escuchando (se cachea por URI).
  private async contexto(idUsuario: number, uri: string): Promise<{ uri: string; nombre: string; subtitulo: string } | null> {
    const enCache = this.contextos.get(uri);
    if (enCache) return { uri, ...enCache };

    const [, tipo, id] = uri.split(':');
    try {
      let nombre = '';
      let subtitulo = 'Spotify';
      if (tipo === 'playlist') {
        const datos = await this.api(idUsuario, 'GET', `/playlists/${id}?fields=name,owner(display_name)`);
        nombre = datos?.name ?? '';
        subtitulo = datos?.owner?.display_name ?? 'Spotify';
      } else if (tipo === 'album') {
        const datos = await this.api(idUsuario, 'GET', `/albums/${id}`);
        nombre = datos?.name ?? '';
        subtitulo = (datos?.artists ?? []).map((a: any) => a.name).join(', ') || 'Álbum';
      } else if (tipo === 'artist') {
        const datos = await this.api(idUsuario, 'GET', `/artists/${id}`);
        nombre = datos?.name ?? '';
        subtitulo = 'Artista';
      }
      if (!nombre) return null;
      this.contextos.set(uri, { nombre, subtitulo });
      return { uri, nombre, subtitulo };
    } catch {
      return null;
    }
  }
}
