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

// Simula Drive: la subida devuelve el ID abc123 y la exportación devuelve "versión de Drive".
const respuestaDrive = (url: string) => url.includes('upload')
    ? new Response(JSON.stringify({ id: 'abc123', webViewLink: ENLACE_SUBIDO }), { status: 200 })
    : new Response('versión de Drive', { status: 200 });

function preparar(driveId: string | null) {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'syntra-servicio-'));
    fs.writeFileSync(path.join(base, RUTA), 'contenido local');
    const almacenamiento = new Almacenamiento(base);
    const estado = { driveId };
    const llamadas: string[] = [];
    const abiertos: string[] = [];

    const fetchFalso: FetchFn = async (url) => {
        llamadas.push(url);
        return respuestaDrive(url);
    };
    const archivos = {
        async obtener() {
            return {
                id: 1, nombre: 'Apuntes', extension: 'docx', rutaFisica: RUTA, driveId: estado.driveId,
                tamanio: 0, fechaDeCarga: new Date(), ultimaFechaAcceso: new Date(),
                ultimaFechaModificacion: new Date(), idPadre: 1,
            };
        },
        async guardarDrive(_id: number, nuevo: string | null) {
            estado.driveId = nuevo;
        },
    } as unknown as Archivos;

    const servicio = new DriveServicio(
        new DriveCliente(async () => 'token', fetchFalso),
        archivos,
        almacenamiento,
        async (url) => { abiertos.push(url); },
    );
    return { servicio, base, estado, llamadas, abiertos };
}


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


    await caso(1, 'Primera vez sube el archivo, guarda el ID y lo abre', 'abc123 | ' + ENLACE_SUBIDO, async () => {
        const { servicio, estado, llamadas, abiertos } = preparar(null);
        await servicio.abrirEnDrive(1);
        comprobar(llamadas.length === 1, 'No se subió el archivo');
        comprobar(estado.driveId === 'abc123', 'No se guardó el ID de Drive');
        return `${estado.driveId} | ${abiertos[0]}`;
    });


    await caso(2, 'Si ya está subido, solo lo abre sin subirlo de nuevo', '0 subidas | ' + ENLACE_SUBIDO, async () => {
        const { servicio, llamadas, abiertos } = preparar('abc123');
        await servicio.abrirEnDrive(1);
        return `${llamadas.length} subidas | ${abiertos[0]}`;
    });


    await caso(3, 'Traer versión de un archivo que nunca se subió', 'Error: Este archivo todavía no se subió a Google Drive.', async () => {
        const { servicio } = preparar(null);
        await esperarError(() => servicio.traerVersion(1), 'Este archivo todavía no se subió a Google Drive.');
        return 'Error: Este archivo todavía no se subió a Google Drive.';
    });


    await caso(4, 'Traer versión reemplaza el contenido local', 'versión de Drive', async () => {
        const { servicio, base } = preparar('abc123');
        await servicio.traerVersion(1);
        return fs.readFileSync(path.join(base, RUTA), 'utf8');
    });


    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal) process.exitCode = 1;
}


main().catch((error) => {
    console.error('MAL: Error al ejecutar las pruebas:', error);
    process.exitCode = 1;
});