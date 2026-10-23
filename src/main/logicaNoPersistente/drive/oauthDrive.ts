import http from 'node:http';
import crypto from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { FetchFn } from './driveCliente';

// Solo ve los archivos que la propia app crea o abre.
export const SCOPE_DRIVE = 'https://www.googleapis.com/auth/drive.file';
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

// Login con Google para apps de escritorio: PKCE + redirección a un puerto local libre.
export class OAuthDrive {
  private acceso: AccesoEnMemoria | null = null;

  constructor(
    private readonly credenciales: CredencialesOAuth,
    private readonly almacen: AlmacenTokens,
    private readonly abrirNavegador: (url: string) => Promise<void>,
    private readonly fetchFn: FetchFn = fetch,
  ) {}

  async obtenerAccessToken(): Promise<string> {
    if (this.acceso && this.acceso.vence > Date.now() + 60_000) {
      return this.acceso.valor;
    }
    const refresh = await this.almacen.leerRefreshToken();
    return refresh ? this.refrescar(refresh) : this.iniciarSesion();
  }

  private async refrescar(refreshToken: string): Promise<string> {
    const datos = await this.pedirTokens({ grant_type: 'refresh_token', refresh_token: refreshToken });
    return this.recordarAcceso(datos.access_token, datos.expires_in);
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
        prompt: 'consent',
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
      return this.recordarAcceso(datos.access_token, datos.expires_in);
    } finally {
      servidor.close();
    }
  }

  private recordarAcceso(valor: string, expiraEn: number): string {
    this.acceso = { valor, vence: Date.now() + expiraEn * 1000 };
    return valor;
  }

  private async pedirTokens(params: Record<string, string>): Promise<{ access_token: string; expires_in: number; refresh_token?: string }> {
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
      throw new Error(`No se pudo obtener el acceso de Google (${respuesta.status}).`);
    }
    return respuesta.json();
  }
}