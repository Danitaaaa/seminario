import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AlmacenTokensDrive, type Cifrador } from '../../logicaNoPersistente/drive/almacenTokensDrive';


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


// Cifrador de prueba: invierte el texto. Sirve para comprobar que no se guarda en texto plano.
const cifradorFalso = (disponible = true): Cifrador => ({
    disponible: () => disponible,
    cifrar: (texto) => Buffer.from([...texto].reverse().join(''), 'utf8'),
    descifrar: (datos) => [...datos.toString('utf8')].reverse().join(''),
});

const carpetaTemporal = () => fs.mkdtempSync(path.join(os.tmpdir(), 'syntra-drive-'));


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


    await caso(1, 'Guardar y leer el refresh token', 'refresh-1', async () => {
        const archivo = path.join(carpetaTemporal(), 'drive-token.bin');
        const almacen = new AlmacenTokensDrive(archivo, cifradorFalso());
        await almacen.guardarRefreshToken('refresh-1');
        return (await almacen.leerRefreshToken()) ?? '';
    });


    await caso(2, 'Sin token guardado devuelve null', 'null', async () => {
        const almacen = new AlmacenTokensDrive(path.join(carpetaTemporal(), 'no-existe.bin'), cifradorFalso());
        return String(await almacen.leerRefreshToken());
    });


    await caso(3, 'No guardar si el cifrado no está disponible', 'Error: No hay cifrado disponible en este equipo.', async () => {
        const archivo = path.join(carpetaTemporal(), 'drive-token.bin');
        const almacen = new AlmacenTokensDrive(archivo, cifradorFalso(false));
        await esperarError(() => almacen.guardarRefreshToken('refresh-1'), 'No hay cifrado disponible en este equipo.');
        comprobar(!fs.existsSync(archivo), 'Se creó el archivo sin cifrado');
        return 'Error: No hay cifrado disponible en este equipo.';
    });


    await caso(4, 'El archivo no guarda el token en texto plano', 'no contiene el token', async () => {
        const archivo = path.join(carpetaTemporal(), 'drive-token.bin');
        await new AlmacenTokensDrive(archivo, cifradorFalso()).guardarRefreshToken('refresh-1');
        comprobar(!fs.readFileSync(archivo, 'utf8').includes('refresh-1'), 'El token quedó en texto plano');
        return 'no contiene el token';
    });


    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal) process.exitCode = 1;
}


main().catch((error) => {
    console.error('MAL: Error al ejecutar las pruebas:', error);
    process.exitCode = 1;
});