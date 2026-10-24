import { createServer, Server } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';

// Permisos que pide la app. Los tres primeros los exige el Web Playback SDK para reproducir dentro de la app.
export const ALCANCES_SPOTIFY = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-library-read',
];

const URL_AUTORIZAR = 'https://accounts.spotify.com/authorize';
export const URL_TOKEN = 'https://accounts.spotify.com/api/token';
const TIEMPO_MAXIMO_MS = 3 * 60 * 1000;

export interface ConfiguracionSpotify {
  clientId: string;
  // Puerto local de la redirección. En el panel de Spotify se registra http://127.0.0.1:<puerto>/callback
  puerto: number;
}

export interface TokensSpotify {
  accessToken: string;
  refreshToken: string;
  expiraEnSeg: number;
  alcances: string;
}

export const uriRedireccion = (puerto: number) => `http://127.0.0.1:${puerto}/callback`;

const base64Url = (buffer: Buffer) =>
  buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// Página que ve el usuario en el navegador al terminar.
const pagina = (titulo: string, texto: string) => `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>${titulo}</title><style>body{font-family:system-ui,sans-serif;background:#F0ECDD;color:#1E2A4A;
display:grid;place-items:center;height:100vh;margin:0}main{background:#fff;padding:32px 40px;border-radius:16px;
box-shadow:0 8px 24px rgba(0,0,0,.08);text-align:center}h1{font-size:20px;margin:0 0 8px}p{margin:0;color:#495B7D}</style>
</head><body><main><h1>${titulo}</h1><p>${texto}</p></main></body></html>`;

// Vinculación con el flujo Authorization Code + PKCE (sin client secret, recomendado para apps de escritorio).
// Abre el login de Spotify en el navegador del sistema y espera la redirección en un servidor local efímero.
export class AutenticacionSpotify {
  private enCurso: Server | null = null;

  constructor(
    private readonly config: ConfiguracionSpotify,
    private readonly abrirNavegador: (url: string) => Promise<void>
  ) {}

  async autorizar(): Promise<TokensSpotify> {
    if (this.enCurso) throw new Error('Ya hay una vinculación con Spotify en curso. Terminala en el navegador.');

    const verificador = base64Url(randomBytes(64));
    const desafio = base64Url(createHash('sha256').update(verificador).digest());
    const estado = base64Url(randomBytes(16));
    const redireccion = uriRedireccion(this.config.puerto);

    const codigo = await new Promise<string>((resolve, reject) => {
      const servidor = createServer((req, res) => {
        const url = new URL(req.url ?? '/', redireccion);
        if (url.pathname !== '/callback') {
          res.writeHead(404).end();
          return;
        }
        const error = url.searchParams.get('error');
        const recibido = url.searchParams.get('code');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        if (error || !recibido || url.searchParams.get('state') !== estado) {
          res.end(pagina('No se pudo vincular Spotify', 'Volvé a la app e intentalo de nuevo.'));
          terminar(new Error(error === 'access_denied' ? 'Cancelaste la vinculación con Spotify.' : 'No se pudo vincular Spotify.'));
          return;
        }
        res.end(pagina('¡Spotify vinculado!', 'Ya podés cerrar esta pestaña y volver a la app.'));
        terminar(null, recibido);
      });

      const temporizador = setTimeout(
        () => terminar(new Error('Se venció el tiempo para vincular Spotify.')),
        TIEMPO_MAXIMO_MS
      );

      const terminar = (error: Error | null, valor?: string) => {
        clearTimeout(temporizador);
        servidor.close();
        this.enCurso = null;
        if (error) reject(error);
        else resolve(valor as string);
      };

      servidor.on('error', (e: NodeJS.ErrnoException) =>
        terminar(new Error(e.code === 'EADDRINUSE'
          ? `El puerto ${this.config.puerto} está ocupado. Cambiá SPOTIFY_PUERTO_REDIRECCION en el .env.`
          : 'No se pudo iniciar la vinculación con Spotify.'))
      );

      servidor.listen(this.config.puerto, '127.0.0.1', () => {
        this.enCurso = servidor;
        const params = new URLSearchParams({
          client_id: this.config.clientId,
          response_type: 'code',
          redirect_uri: redireccion,
          code_challenge_method: 'S256',
          code_challenge: desafio,
          state: estado,
          scope: ALCANCES_SPOTIFY.join(' '),
        });
        this.abrirNavegador(`${URL_AUTORIZAR}?${params}`).catch((e) => terminar(e));
      });
    });

    const respuesta = await fetch(URL_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: codigo,
        redirect_uri: redireccion,
        client_id: this.config.clientId,
        code_verifier: verificador,
      }),
    });
    if (!respuesta.ok) throw new Error('Spotify rechazó la vinculación. Revisá el Client ID y la URL de redirección.');
    const datos: any = await respuesta.json();
    return {
      accessToken: datos.access_token,
      refreshToken: datos.refresh_token,
      expiraEnSeg: datos.expires_in,
      alcances: datos.scope ?? ALCANCES_SPOTIFY.join(' '),
    };
  }
}
