import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Persistencia } from '../../persistencia/persistencia';
import { ObtenerFondoInicio, ActualizarFondoInicio } from '../../logicaPersistente/gestionDeInicio/fondoInicio';


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


// Simula la columna usuarios.fondo_inicio de un solo usuario (id 12).
function crearPersistencia(inicial: string | null = null, existe = true) {
    const estado = { fondo: inicial };
    const persistencia = {
        async ejecutar(sql: string, valores: unknown[] = []) {
            if (sql.startsWith('SELECT')) return existe ? [{ fondo_inicio: estado.fondo }] : [];
            estado.fondo = String(valores[0]);
            return [];
        },
    } as unknown as Persistencia;
    return { persistencia, estado };
}

const carpetaTemporal = () => fs.mkdtempSync(path.join(os.tmpdir(), 'syntra-fondo-'));

function imagenDePrueba(nombre: string, bytes = 16): string {
    const ruta = path.join(carpetaTemporal(), nombre);
    fs.writeFileSync(ruta, Buffer.alloc(bytes, 1));
    return ruta;
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


    await caso(1, 'Sin imagen guardada devuelve null', 'null', async () => {
        const { persistencia } = crearPersistencia();
        return String(await new ObtenerFondoInicio(persistencia).ejecutar(12));
    });


    await caso(2, 'Subir una imagen la copia y la devuelve lista para mostrar', 'data:image/png | 12.png', async () => {
        const { persistencia, estado } = crearPersistencia();
        const carpeta = carpetaTemporal();
        const url = await new ActualizarFondoInicio(persistencia, carpeta).ejecutar(12, imagenDePrueba('playa.png'));
        comprobar(fs.existsSync(path.join(carpeta, '12.png')), 'No se copió la imagen');
        return `${String(url).slice(0, 14)} | ${path.basename(String(estado.fondo))}`;
    });


    await caso(3, 'Cambiar de imagen borra la anterior', 'solo 12.jpg', async () => {
        const carpeta = carpetaTemporal();
        const anterior = path.join(carpeta, '12.png');
        fs.writeFileSync(anterior, 'vieja');
        const { persistencia } = crearPersistencia(anterior);
        await new ActualizarFondoInicio(persistencia, carpeta).ejecutar(12, imagenDePrueba('montaña.jpg'));
        return fs.readdirSync(carpeta).join(',') === '12.jpg' ? 'solo 12.jpg' : fs.readdirSync(carpeta).join(',');
    });


    await caso(4, 'Rechazar un formato que no es imagen', 'Error: La imagen debe ser PNG, JPG o WEBP.', async () => {
        const { persistencia } = crearPersistencia();
        await esperarError(
            () => new ActualizarFondoInicio(persistencia, carpetaTemporal()).ejecutar(12, imagenDePrueba('apunte.pdf')),
            'La imagen debe ser PNG, JPG o WEBP.',
        );
        return 'Error: La imagen debe ser PNG, JPG o WEBP.';
    });


    await caso(5, 'Rechazar una imagen de más de 5 MB', 'Error: La imagen puede pesar hasta 5 MB.', async () => {
        const { persistencia, estado } = crearPersistencia();
        await esperarError(
            () => new ActualizarFondoInicio(persistencia, carpetaTemporal())
                .ejecutar(12, imagenDePrueba('enorme.jpg', 5 * 1024 * 1024 + 1)),
            'La imagen puede pesar hasta 5 MB.',
        );
        comprobar(estado.fondo === null, 'Se guardó una imagen demasiado pesada');
        return 'Error: La imagen puede pesar hasta 5 MB.';
    });


    await caso(6, 'Usuario inexistente', 'Error: El usuario no existe.', async () => {
        const { persistencia } = crearPersistencia(null, false);
        await esperarError(() => new ObtenerFondoInicio(persistencia).ejecutar(99), 'El usuario no existe.');
        return 'Error: El usuario no existe.';
    });


    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal) process.exitCode = 1;
}


main().catch((error) => {
    console.error('MAL: Error al ejecutar las pruebas:', error);
    process.exitCode = 1;
});