import { DriveCliente, MENSAJE_FORMATOS, type FetchFn } from '../../logicaNoPersistente/drive/driveCliente';


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


interface Llamada {
    url: string;
    init: RequestInit;
}

// Simula la API de Drive: guarda cada llamada y responde lo que se le indique.
function crearFetchFalso(respuesta: () => Response) {
    const llamadas: Llamada[] = [];
    const fetchFalso: FetchFn = async (url, init = {}) => {
        llamadas.push({ url, init });
        return respuesta();
    };
    return { fetchFalso, llamadas };
}

const tokenPrueba = async () => 'token-prueba';


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


    await caso(1, 'Subir Word devuelve id y enlace de Drive', 'abc123 | https://docs.google.com/document/d/abc123/edit', async () => {
        const { fetchFalso, llamadas } = crearFetchFalso(() => new Response(
            JSON.stringify({ id: 'abc123', webViewLink: 'https://docs.google.com/document/d/abc123/edit' }),
            { status: 200 },
        ));
        const drive = new DriveCliente(tokenPrueba, fetchFalso);
        const archivo = await drive.subirComoGoogle('Apuntes', 'docx', Buffer.from('hola'));
        comprobar(llamadas[0].url.includes('uploadType=multipart'), 'No se usó subida multipart');
        comprobar((llamadas[0].init.headers as Record<string, string>).Authorization === 'Bearer token-prueba',
            'No se envió el token');
        return `${archivo.id} | ${archivo.webViewLink}`;
    });


    await caso(2, 'Subir Word pide conversión a Google Docs', 'application/vnd.google-apps.document', async () => {
        const { fetchFalso, llamadas } = crearFetchFalso(() => new Response(
            JSON.stringify({ id: 'x', webViewLink: 'y' }), { status: 200 },
        ));
        await new DriveCliente(tokenPrueba, fetchFalso).subirComoGoogle('Apuntes', 'docx', Buffer.from('hola'));
        const cuerpo = Buffer.from(llamadas[0].init.body as Uint8Array).toString('utf8');
        comprobar(cuerpo.includes('"mimeType":"application/vnd.google-apps.document"'),
            'El cuerpo no pide convertir a Google Docs');
        comprobar(cuerpo.includes('hola'), 'El contenido del archivo no se envió');
        return 'application/vnd.google-apps.document';
    });


    await caso(3, 'Descargar versión de Drive pide el formato Word', 'hola desde Drive', async () => {
        const { fetchFalso, llamadas } = crearFetchFalso(() => new Response('hola desde Drive', { status: 200 }));
        const contenido = await new DriveCliente(tokenPrueba, fetchFalso).descargarComoOffice('abc123', 'docx');
        comprobar(llamadas[0].url.includes('/drive/v3/files/abc123/export'), 'La URL de exportación no es la esperada');
        comprobar(llamadas[0].url.includes(encodeURIComponent(
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
            'No se pidió el formato Word');
        return contenido.toString('utf8');
    });


    await caso(4, 'Rechazar extensión que Drive no convierte', `Error: ${MENSAJE_FORMATOS}`, async () => {
        const { fetchFalso, llamadas } = crearFetchFalso(() => new Response('', { status: 200 }));
        await esperarError(
            () => new DriveCliente(tokenPrueba, fetchFalso).subirComoGoogle('Libro', 'pdf', Buffer.from('x')),
            MENSAJE_FORMATOS,
        );
        comprobar(llamadas.length === 0, 'Se llamó a Drive con una extensión no soportada');
        return `Error: ${MENSAJE_FORMATOS}`;
    });


    await caso(5, 'Informar error de Drive con su código', 'Error: Google Drive respondió 401: Unauthorized', async () => {
        const { fetchFalso } = crearFetchFalso(() => new Response('Unauthorized', { status: 401 }));
        await esperarError(
            () => new DriveCliente(tokenPrueba, fetchFalso).descargarComoOffice('abc123', 'docx'),
            'Google Drive respondió 401: Unauthorized',
        );
        return 'Error: Google Drive respondió 401: Unauthorized';
    });


    await caso(6, 'Plantilla de Excel sube como plantilla y vuelve como Excel', 'sube xltx | vuelve xlsx', async () => {
        const { fetchFalso, llamadas } = crearFetchFalso(() => new Response(
            JSON.stringify({ id: 'x', webViewLink: 'y' }), { status: 200 },
        ));
        const drive = new DriveCliente(tokenPrueba, fetchFalso);
        await drive.subirComoGoogle('Plantilla', 'xltx', Buffer.from('hola'));
        await drive.descargarComoOffice('x', 'xltx');
        const cuerpo = Buffer.from(llamadas[0].init.body as Uint8Array).toString('utf8');
        comprobar(cuerpo.includes('spreadsheetml.template'), 'No se subió con el formato de plantilla');
        comprobar(cuerpo.includes('"mimeType":"application/vnd.google-apps.spreadsheet"'), 'No se pidió convertir a Sheets');
        comprobar(llamadas[1].url.includes(encodeURIComponent('spreadsheetml.sheet')), 'No se pidió volver como Excel');
        return 'sube xltx | vuelve xlsx';
    });


    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal) process.exitCode = 1;
}


main().catch((error) => {
    console.error('MAL: Error al ejecutar las pruebas:', error);
    process.exitCode = 1;
});