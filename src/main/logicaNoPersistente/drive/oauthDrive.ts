import http from 'node:http';
import crypto from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { FetchFn } from './driveCliente';

// Solo ve los archivos que la propia app crea o abre. "openid email" es para saber con qué cuenta
// se entró y abrir los documentos con esa misma (si el navegador tiene varias cuentas de Google).
export const SCOPE_DRIVE = 'openid email https://www.googleapis.com/auth/drive.file';
const URL_AUTORIZACION = 'https://accounts.google.com/o/oauth2/v2/auth';
const URL_TOKEN = 'https://oauth2.googleapis.com/token';
const TIEMPO_MAXIMO_LOGIN_MS = 5 * 60 * 1000;

export interface CredencialesOAuth {
  clientId: string;
  clientSecret: string;
}

// El refresh token se guarda cifrado afuera (safeStorage); acá solo se pide y se entrega.
export interface AlmacenTokens {
  leerRefreshToken(): Promise<string | null>;
  guardarRefreshToken(token: string): Promise<void>;
}

interface AccesoEnMemoria {
  valor: string;
  vence: number;
}

const base64url = (buffer: Buffer) => buffer.toString('base64url');

// El id_token de Google es un JWT: el correo está en la parte del medio. Solo se usa para elegir la cuenta.
function correoDe(idToken: string | undefined): string | null {
  try {
    const datos = JSON.parse(Buffer.from(idToken?.split('.')[1] ?? '', 'base64url').toString('utf8'));
    return typeof datos.email === 'string' ? datos.email : null;
  } catch {
    return null;
  }
}

// Agrega la cuenta al enlace de Google, así no se abre con otra cuenta del navegador.
export function conCuenta(url: string, correo: string | null): string {
  if (!correo) return url;
  const enlace = new URL(url);
  enlace.searchParams.set('authuser', correo);
  return enlace.toString();
}

// Lo lanza el inicio de sesión cuando el usuario lo cancela desde la app.
export class ErrorLoginCancelado extends Error {
  constructor() {
    super('Se canceló el inicio de sesión con Google.');
  }
}

class ErrorTokens extends Error {
  constructor(readonly estado: number) {
    super(`No se pudo obtener el acceso de Google (${estado}).`);
  }
}

// Login con Google para apps de escritorio: PKCE + redirección a un puerto local libre.
export class OAuthDrive {
  private acceso: AccesoEnMemoria | null = null;
  private cancelarLogin: (() => void) | null = null;
  private correo: string | null = null;

  constructor(
    private readonly credenciales: CredencialesOAuth,
    private readonly almacen: AlmacenTokens,
    private readonly abrirNavegador: (url: string) => Promise<void>,
    private readonly fetchFn: FetchFn = fetch,
  ) {}

  // Cuenta de Google con la que se entró (null si todavía no se sabe).
  cuenta(): string | null {
    return this.correo;
  }

  // Corta la espera del inicio de sesión (por ejemplo, si el usuario cerró la pestaña de Google).
  cancelar(): void {
    this.cancelarLogin?.();
  }

  async obtenerAccessToken(): Promise<string> {
    if (this.acceso && this.acceso.vence > Date.now() + 60_000) {
      return this.acceso.valor;
    }
    const refresh = await this.almacen.leerRefreshToken();
    return refresh ? this.refrescar(refresh) : this.iniciarSesion();
  }

  private async refrescar(refreshToken: string): Promise<string> {
    try {
      const datos = await this.pedirTokens({ grant_type: 'refresh_token', refresh_token: refreshToken });
      this.correo = correoDe(datos.id_token) ?? this.correo;
      return this.recordarAcceso(datos.access_token, datos.expires_in);
    } catch (error) {
      // 400/401: el permiso venció o se revocó (en modo prueba, Google lo vence a los 7 días).
      // Se vuelve a pedir el inicio de sesión; el nuevo permiso reemplaza al guardado.
      if (error instanceof ErrorTokens && (error.estado === 400 || error.estado === 401)) return this.iniciarSesion();
      throw error;
    }
  }

  private async iniciarSesion(): Promise<string> {
    const verificador = base64url(crypto.randomBytes(32));
    const desafio = base64url(crypto.createHash('sha256').update(verificador).digest());
    const estado = base64url(crypto.randomBytes(16));

    const servidor = http.createServer();
    const redirect = await new Promise<string>((resolve) => {
      servidor.listen(0, '127.0.0.1', () => {
        resolve(`http://127.0.0.1:${(servidor.address() as AddressInfo).port}`);
      });
    });

    try {
      const codigo = new Promise<string>((resolve, reject) => {
        const tiempo = setTimeout(() => reject(new Error('Se agotó el tiempo para autorizar en Google.')), TIEMPO_MAXIMO_LOGIN_MS);
        this.cancelarLogin = () => {
          clearTimeout(tiempo);
          reject(new ErrorLoginCancelado());
        };
        servidor.on('request', (req, res) => {
          clearTimeout(tiempo);
          const parametros = new URL(req.url ?? '/', 'http://127.0.0.1').searchParams;
          const error = parametros.get('error');
          const code = parametros.get('code');
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          if (error || !code || parametros.get('state') !== estado) {
            res.end('<p>No se pudo completar la autorización. Podés cerrar esta ventana y volver a intentarlo.</p>');
            reject(new Error(error ? `Google canceló la autorización: ${error}` : 'La respuesta de Google no es válida.'));
          } else {
            res.end('<p>Listo, ya podés volver a Syntra.</p>');
            resolve(code);
          }
        });
      });

      // Si Google responde antes de que se espere, el error no debe quedar sin manejar.
      codigo.catch(() => {});

      const url = `${URL_AUTORIZACION}?${new URLSearchParams({
        client_id: this.credenciales.clientId,
        redirect_uri: redirect,
        response_type: 'code',
        scope: SCOPE_DRIVE,
        code_challenge: desafio,
        code_challenge_method: 'S256',
        access_type: 'offline',
        // Siempre pregunta con qué cuenta entrar, en vez de usar la primera del navegador.
        prompt: 'select_account consent',
        state: estado,
      })}`;
      await this.abrirNavegador(url);

      const datos = await this.pedirTokens({
        grant_type: 'authorization_code',
        code: await codigo,
        redirect_uri: redirect,
        code_verifier: verificador,
      });
      if (datos.refresh_token) await this.almacen.guardarRefreshToken(datos.refresh_token);
      this.correo = correoDe(datos.id_token);
      return this.recordarAcceso(datos.access_token, datos.expires_in);
    } finally {
      this.cancelarLogin = null;
      servidor.close();
    }
  }

  private recordarAcceso(valor: string, expiraEn: number): string {
    this.acceso = { valor, vence: Date.now() + expiraEn * 1000 };
    return valor;
  }

  private async pedirTokens(params: Record<string, string>): Promise<{ access_token: string; expires_in: number; refresh_token?: string; id_token?: string }> {
    const cuerpo = new URLSearchParams({
      client_id: this.credenciales.clientId,
      client_secret: this.credenciales.clientSecret,
      ...params,
    });
    const respuesta = await this.fetchFn(URL_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: cuerpo,
    });
    if (!respuesta.ok) {
      throw new ErrorTokens(respuesta.status);
    }
    return respuesta.json();
  }
}