 import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DriveServicio } from '../../logicaNoPersistente/drive/driveServicio';
import { DriveCliente, type FetchFn } from '../../logicaNoPersistente/drive/driveCliente';
import { Almacenamiento } from '../../persistencia/almacenamiento';
import type { Archivos } from '../../administracionDePersistencia/archivos';


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


const RUTA = 'archivo.docx';
const ENLACE_SUBIDO = 'https://docs.google.com/document/d/abc123/edit';
const HUELLA_LOCAL = createHash('sha256').update('contenido local').digest('hex');

interface OpcionesPrueba {
    driveId: string | null;
    huella?: string | null;      // huella anotada en la última sincronización
    modificado?: string | null;  // fecha de Drive anotada en la última sincronización
    remoto?: string;             // fecha de Drive ahora
    sinPermiso?: boolean;        // el cliente sin inicio de sesión no tiene permiso
}

// Simula Drive: la subida devuelve el ID abc123, la actualización una fecha nueva
// y la exportación devuelve "versión de Drive".
function preparar(opciones: OpcionesPrueba) {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'syntra-servicio-'));
    fs.writeFileSync(path.join(base, RUTA), 'contenido local');
    const almacenamiento = new Almacenamiento(base);
    const estado = { driveId: opciones.driveId, huella: opciones.huella ?? null, modificado: opciones.modificado ?? null };
    const remoto = opciones.remoto ?? 'T1';
    const llamadas: string[] = [];
    const abiertos: string[] = [];

    const fetchFalso: FetchFn = async (url, init) => {
        const metodo = init?.method ?? 'GET';
        llamadas.push(`${metodo} ${url}`);
        if (metodo === 'POST') {
            return new Response(JSON.stringify({ id: 'abc123', webViewLink: ENLACE_SUBIDO, modifiedTime: 'T1' }), { status: 200 });
        }
        if (metodo === 'PATCH') return new Response(JSON.stringify({ modifiedTime: 'T9' }), { status: 200 });
        if (url.endsWith('fields=modifiedTime')) return new Response(JSON.stringify({ modifiedTime: remoto }), { status: 200 });
        return new Response('versión de Drive', { status: 200 });
    };
    const archivos = {
        async obtener() {
            return {
                id: 1, nombre: 'Apuntes', extension: 'docx', rutaFisica: RUTA, driveId: estado.driveId,
                driveHuella: estado.huella, driveModificado: estado.modificado,
                tamanio: 0, fechaDeCarga: new Date(), ultimaFechaAcceso: new Date(),
                ultimaFechaModificacion: new Date(), idPadre: 1,
            };
        },
        async guardarDrive(_id: number, nuevo: string | null, sinc?: { huella: string; modificado: string } | null) {
            estado.driveId = nuevo;
            estado.huella = sinc?.huella ?? null;
            estado.modificado = sinc?.modificado ?? null;
        },
    } as unknown as Archivos;

    const sinLogin = opciones.sinPermiso
        ? new DriveCliente(async () => { throw new Error('Hay que volver a conectar la cuenta de Google.'); }, fetchFalso)
        : new DriveCliente(async () => 'token', fetchFalso);
    const servicio = new DriveServicio(
        new DriveCliente(async () => 'token', fetchFalso),
        archivos,
        almacenamiento,
        async (url) => { abiertos.push(url); },
        sinLogin,
    );
    const contar = (metodo: string) => llamadas.filter((l) => l.startsWith(metodo)).length;
    const local = () => fs.readFileSync(path.join(base, RUTA), 'utf8');
    return { servicio, base, estado, llamadas, abiertos, contar, local };
}

// Ya sincronizado y sin cambios en ningún lado.
const sincronizado = { driveId: 'abc123', huella: HUELLA_LOCAL, modificado: 'T1', remoto: 'T1' };


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


    await caso(1, 'Primera vez sube el archivo, guarda el ID y lo abre', 'abc123 | T1 | ' + ENLACE_SUBIDO, async () => {
        const { servicio, estado, contar, abiertos } = preparar({ driveId: null });
        await servicio.abrirEnDrive(1);
        comprobar(contar('POST') === 1, 'No se subió el archivo');
        comprobar(estado.huella === HUELLA_LOCAL, 'No se anotó la huella del archivo');
        return `${estado.driveId} | ${estado.modificado} | ${abiertos[0]}`;
    });


    await caso(2, 'Si ya está subido y no cambió, solo lo abre', '0 subidas | ' + ENLACE_SUBIDO, async () => {
        const { servicio, contar, abiertos } = preparar(sincronizado);
        await servicio.abrirEnDrive(1);
        return `${contar('POST') + contar('PATCH')} subidas | ${abiertos[0]}`;
    });


    await caso(3, 'Traer versión de un archivo que nunca se subió', 'Error: Este archivo todavía no se subió a Google Drive.', async () => {
        const { servicio } = preparar({ driveId: null });
        await esperarError(() => servicio.traerVersion(1), 'Este archivo todavía no se subió a Google Drive.');
        return 'Error: Este archivo todavía no se subió a Google Drive.';
    });


    await caso(4, 'Traer versión reemplaza el contenido local y anota la sincronización', 'versión de Drive | T5', async () => {
        const { servicio, local, estado } = preparar({ ...sincronizado, remoto: 'T5' });
        await servicio.traerVersion(1);
        return `${local()} | ${estado.modificado}`;
    });


    await caso(5, 'Cambió en Syntra: al abrir en Google primero sube los cambios', '1 actualización | T9 | abierto', async () => {
        const { servicio, contar, estado, abiertos } = preparar({ ...sincronizado, huella: 'otra' });
        const r = await servicio.abrirEnDrive(1);
        comprobar(abiertos.length === 1, 'No se abrió el documento');
        return `${contar('PATCH')} actualización | ${estado.modificado} | ${r}`;
    });


    await caso(6, 'Cambió en Google: al abrir en Syntra se trae la versión de Google', 'traido | versión de Drive', async () => {
        const { servicio, local } = preparar({ ...sincronizado, remoto: 'T5' });
        const r = await servicio.revisarAlAbrir(1);
        return `${r} | ${local()}`;
    });


    await caso(7, 'Cambió en los dos lados: no pisa nada y avisa el conflicto', 'conflicto | 0 abiertos | 0 subidas | contenido local', async () => {
        const { servicio, abiertos, contar, local } = preparar({ ...sincronizado, huella: 'otra', remoto: 'T5' });
        const r = await servicio.abrirEnDrive(1);
        return `${r} | ${abiertos.length} abiertos | ${contar('PATCH')} subidas | ${local()}`;
    });


    await caso(8, 'Conflicto resuelto con la de Syntra: la sube a Google y abre', '1 subida | abierto', async () => {
        const { servicio, contar } = preparar({ ...sincronizado, huella: 'otra', remoto: 'T5' });
        const r = await servicio.abrirEnDrive(1, 'syntra');
        return `${contar('PATCH')} subida | ${r}`;
    });


    await caso(9, 'Conflicto resuelto con la de Google: la trae a Syntra', 'traido | versión de Drive | 0 subidas', async () => {
        const { servicio, local, contar } = preparar({ ...sincronizado, huella: 'otra', remoto: 'T5' });
        const r = await servicio.revisarAlAbrir(1, 'google');
        return `${r} | ${local()} | ${contar('PATCH')} subidas`;
    });


    await caso(10, 'Sin permiso de Google, abrir en Syntra no falla ni pide iniciar sesión', 'nada | contenido local', async () => {
        const { servicio, local } = preparar({ ...sincronizado, remoto: 'T5', sinPermiso: true });
        const r = await servicio.revisarAlAbrir(1);
        return `${r} | ${local()}`;
    });


    await caso(11, 'Archivo que no está en Drive: abrir en Syntra no consulta a Google', 'nada | 0 consultas', async () => {
        const { servicio, llamadas } = preparar({ driveId: null });
        const r = await servicio.revisarAlAbrir(1);
        return `${r} | ${llamadas.length} consultas`;
    });


    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal) process.exitCode = 1;
}


main().catch((error) => {
    console.error('MAL: Error al ejecutar las pruebas:', error);
    process.exitCode = 1;
});