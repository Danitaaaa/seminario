import { OAuthDrive, SCOPE_DRIVE, type AlmacenTokens } from '../../logicaNoPersistente/drive/oauthDrive';
import type { FetchFn } from '../../logicaNoPersistente/drive/driveCliente';


const comprobar = (ok: boolean, mensaje: string): void => {
    if (!ok) throw new Error(mensaje);
};


async function esperarError(accion: () => Promise<unknown>, esperado: string): Promise<void> {
    try {
        await accion();
    } catch (error) {
        comprobar(error instanceof Error && error.message === esperado,
            `Se esperaba "${esperado}" y se recibió "${String(error)}"`);
        return;
    }
    throw new Error(`Se esperaba el error "${esperado}"`);
}


const credenciales = { clientId: 'cliente-prueba', clientSecret: 'secreto-prueba' };

function crearAlmacen(refreshInicial: string | null = null) {
    let refresh = refreshInicial;
    const almacen: AlmacenTokens = {
        async leerRefreshToken() { return refresh; },
        async guardarRefreshToken(token: string) { refresh = token; },
    };
    return { almacen, leer: () => refresh };
}

// Simula la API de tokens de Google.
function crearTokenEndpoint(respuesta: () => Response) {
    const llamadas: { body: string }[] = [];
    const fetchFalso: FetchFn = async (_url, init = {}) => {
        llamadas.push({ body: String(init.body) });
        return respuesta();
    };
    return { fetchFalso, llamadas };
}

// Simula al usuario que autoriza en el navegador: vuelve a la dirección local con el código.
function navegadorQueAutoriza(estadoForzado?: string) {
    const urls: string[] = [];
    const abrir = async (url: string) => {
        urls.push(url);
        const parametros = new URL(url).searchParams;
        const destino = new URL(parametros.get('redirect_uri') ?? '');
        destino.searchParams.set('code', 'codigo-prueba');
        destino.searchParams.set('state', estadoForzado ?? parametros.get('state') ?? '');
        await fetch(destino);
    };
    return { abrir, urls };
}

const respuestaTokens = (access = 'acceso-1', refresh?: string) => () => new Response(
    JSON.stringify({ access_token: access, expires_in: 3600, ...(refresh ? { refresh_token: refresh } : {}) }),
    { status: 200 },
);


async function main(): Promise<void> {
    let bien = 0;
    let mal = 0;
    const caso = async (id: number, nombre: string, esperada: string, prueba: () => Promise<string>) => {
        console.log(`\nID: ${id}\nNombre: ${nombre}\nSalida esperada: ${esperada}`);
        try {
            const obtenida = await prueba();
            comprobar(obtenida === esperada, `Se obtuvo "${obtenida}"`);
            bien++;
            console.log(`Salida obtenida: ${obtenida}\nBIEN: ${nombre}`);
        } catch (error) {
            mal++;
            console.error(`Salida obtenida: ${String(error)}\nMAL: ${nombre}`);
        }
    };


    await caso(1, 'Primer login abre Google, guarda el refresh token y devuelve el acceso', 'acceso-1 | refresh-1 | PKCE S256 + drive.file', async () => {
        const { almacen, leer } = crearAlmacen();
        const tokens = crearTokenEndpoint(respuestaTokens('acceso-1', 'refresh-1'));
        const navegador = navegadorQueAutoriza();
        const acceso = await new OAuthDrive(credenciales, almacen, navegador.abrir, tokens.fetchFalso).obtenerAccessToken();
        const url = new URL(navegador.urls[0]);
        comprobar(url.searchParams.get('code_challenge_method') === 'S256', 'No se usó PKCE S256');
        comprobar(url.searchParams.get('scope') === SCOPE_DRIVE, 'El alcance no es drive.file');
        comprobar(url.searchParams.get('access_type') === 'offline', 'No se pidió acceso offline');
        return `${acceso} | ${leer()} | PKCE S256 + drive.file`;
    });


    await caso(2, 'Rechazar respuesta de Google con estado que no coincide', 'Error: La respuesta de Google no es válida.', async () => {
        const { almacen, leer } = crearAlmacen();
        const tokens = crearTokenEndpoint(respuestaTokens());
        await esperarError(
            () => new OAuthDrive(credenciales, almacen, navegadorQueAutoriza('estado-falso').abrir, tokens.fetchFalso)
                .obtenerAccessToken(),
            'La respuesta de Google no es válida.',
        );
        comprobar(tokens.llamadas.length === 0, 'Se canjeó un código con un estado inválido');
        comprobar(leer() === null, 'Se guardó un token con un estado inválido');
        return 'Error: La respuesta de Google no es válida.';
    });


    await caso(3, 'Con refresh token guardado no abre el navegador y renueva el acceso', 'acceso-2 | sin navegador', async () => {
        const { almacen } = crearAlmacen('refresh-guardado');
        const tokens = crearTokenEndpoint(respuestaTokens('acceso-2'));
        const navegador = navegadorQueAutoriza();
        const acceso = await new OAuthDrive(credenciales, almacen, navegador.abrir, tokens.fetchFalso).obtenerAccessToken();
        comprobar(navegador.urls.length === 0, 'Abrió el navegador pese a tener refresh token');
        comprobar(tokens.llamadas[0].body.includes('grant_type=refresh_token'), 'No se usó el refresh token');
        return `${acceso} | sin navegador`;
    });


    await caso(4, 'Reutilizar el acceso vigente sin volver a pedirlo', 'acceso-3 | 1 sola llamada', async () => {
        const { almacen } = crearAlmacen('refresh-guardado');
        const tokens = crearTokenEndpoint(respuestaTokens('acceso-3'));
        const oauth = new OAuthDrive(credenciales, almacen, navegadorQueAutoriza().abrir, tokens.fetchFalso);
        await oauth.obtenerAccessToken();
        const segundo = await oauth.obtenerAccessToken();
        comprobar(tokens.llamadas.length === 1, `Se pidieron ${tokens.llamadas.length} accesos`);
        return `${segundo} | 1 sola llamada`;
    });


    await caso(5, 'Informar error de Google al canjear el código', 'Error: No se pudo obtener el acceso de Google (400).', async () => {
        const { almacen } = crearAlmacen();
        const tokens = crearTokenEndpoint(() => new Response('invalid_grant', { status: 400 }));
        await esperarError(
            () => new OAuthDrive(credenciales, almacen, navegadorQueAutoriza().abrir, tokens.fetchFalso).obtenerAccessToken(),
            'No se pudo obtener el acceso de Google (400).',
        );
        return 'Error: No se pudo obtener el acceso de Google (400).';
    });


    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal) process.exitCode = 1;
}


main().catch((error) => {
    console.error('MAL: Error al ejecutar las pruebas:', error);
    process.exitCode = 1;
});