import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { copiarACarpeta, nombreSeguro } from '../../logicaNoPersistente/descargas/copiarArchivos';
import { nombreLibre } from '../../logicaNoPersistente/importarMaterial/importarRutas';

// Tests de descargar archivos de Syntra y de los nombres al subir o crear documentos.
// Se corren con: npx tsx src/main/tests/descargas/testDescargasYNombres.ts (usa una carpeta temporal, no toca nada tuyo).

const comprobar = (ok: boolean, mensaje: string): void => {
    if (!ok) throw new Error(mensaje);
};

async function main(): Promise<void> {
    let bien = 0;
    let mal = 0;

    const caso = async (id: number, nombre: string, esperada: string, prueba: () => Promise<string> | string) => {
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

    const temporal = fs.mkdtempSync(path.join(os.tmpdir(), 'syntra-test-'));
    const almacen = path.join(temporal, 'almacen');
    const destino = path.join(temporal, 'descargas');
    fs.mkdirSync(almacen);
    fs.mkdirSync(destino);
    fs.writeFileSync(path.join(almacen, '1.pdf'), 'apunte nuevo');
    fs.writeFileSync(path.join(almacen, '2.txt'), 'resumen');

    try {
        await caso(1, 'Nombre con caracteres que Windows no acepta', 'TP_ Unidad 1_2 _final_', () =>
            nombreSeguro('TP: Unidad 1/2 "final"'));

        await caso(2, 'Nombre que queda vacío', 'archivo', () => nombreSeguro('   '));

        await caso(3, 'Descargar varios archivos a una carpeta', '2 copiados, 0 fallidos | Apunte.pdf, Resumen.txt', async () => {
            const r = await copiarACarpeta(destino, [
                { origen: path.join(almacen, '1.pdf'), nombre: 'Apunte', extension: 'pdf' },
                { origen: path.join(almacen, '2.txt'), nombre: 'Resumen', extension: 'txt' },
            ]);
            return `${r.copiados} copiados, ${r.fallidos} fallidos | ${fs.readdirSync(destino).sort().join(', ')}`;
        });

        await caso(4, 'Si ya existe, no lo pisa: lo guarda como "(2)"', 'Apunte (2).pdf | el original sigue igual', async () => {
            fs.writeFileSync(path.join(destino, 'Apunte.pdf'), 'mío, no tocar');
            await copiarACarpeta(destino, [{ origen: path.join(almacen, '1.pdf'), nombre: 'Apunte', extension: 'pdf' }]);
            const original = fs.readFileSync(path.join(destino, 'Apunte.pdf'), 'utf8');
            return `${fs.existsSync(path.join(destino, 'Apunte (2).pdf')) ? 'Apunte (2).pdf' : 'no lo creó'} | ${original === 'mío, no tocar' ? 'el original sigue igual' : 'lo pisó'}`;
        });

        await caso(5, 'Si un archivo no se encuentra, copia los demás igual', '1 copiados, 1 fallidos', async () => {
            const r = await copiarACarpeta(destino, [
                { origen: path.join(almacen, 'no-existe.pdf'), nombre: 'Perdido', extension: 'pdf' },
                { origen: path.join(almacen, '2.txt'), nombre: 'Otro', extension: 'txt' },
            ]);
            return `${r.copiados} copiados, ${r.fallidos} fallidos`;
        });

        await caso(6, 'Crear un documento con un nombre que ya está en la carpeta', 'Notas (2)', () =>
            nombreLibre('Notas', 'docx', new Set(['notas.docx'])));

        await caso(7, 'Mayúsculas y minúsculas cuentan como el mismo nombre', 'Apuntes (3)', () =>
            nombreLibre('Apuntes', '', new Set(['apuntes', 'APUNTES (2)'.toLowerCase()])));

        await caso(8, 'Mismo nombre con otra extensión no choca', 'Notas', () =>
            nombreLibre('Notas', 'txt', new Set(['notas.docx'])));

        await caso(9, 'Dos documentos seguidos con el mismo nombre', 'Nuevo documento, Nuevo documento (2)', () => {
            const usados = new Set<string>();
            return `${nombreLibre('Nuevo documento', 'docx', usados)}, ${nombreLibre('Nuevo documento', 'docx', usados)}`;
        });

        await caso(10, 'Nombre con la tilde separada (de Mac) se guarda junta', 'Análisis | igual al escrito a mano', () => {
            const deMac = 'Análisis'.normalize('NFC');
            return `${deMac} | ${deMac === 'Análisis' ? 'igual al escrito a mano' : 'distinto'}`;
        });
    } finally {
        fs.rmSync(temporal, { recursive: true, force: true });
    }

    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal > 0) process.exitCode = 1;
}

main();
