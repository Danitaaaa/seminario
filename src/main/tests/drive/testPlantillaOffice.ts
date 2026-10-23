import JSZip from 'jszip';
import { aPlantilla } from '../../logicaNoPersistente/drive/plantillaOffice';


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


const EXCEL_MAIN = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml';
const PLANTILLA_MAIN = 'application/vnd.openxmlformats-officedocument.spreadsheetml.template.main+xml';

// Arma un Excel mínimo: un zip con su [Content_Types].xml y una hoja.
async function excelMinimo(): Promise<Buffer> {
    const zip = new JSZip();
    zip.file('[Content_Types].xml',
        `<?xml version="1.0"?><Types><Override PartName="/xl/workbook.xml" ContentType="${EXCEL_MAIN}"/></Types>`);
    zip.file('xl/workbook.xml', '<workbook/>');
    return zip.generateAsync({ type: 'nodebuffer' });
}

async function tiposDe(contenido: Buffer): Promise<string> {
    const zip = await JSZip.loadAsync(contenido);
    return (await zip.file('[Content_Types].xml')?.async('string')) ?? '';
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


    await caso(1, 'Convertir el Excel que devuelve Drive en plantilla', 'es plantilla', async () => {
        const tipos = await tiposDe(await aPlantilla(await excelMinimo(), 'xltx'));
        comprobar(tipos.includes(PLANTILLA_MAIN), 'No quedó marcado como plantilla');
        comprobar(!tipos.includes(EXCEL_MAIN), 'Quedó el tipo de Excel común');
        return 'es plantilla';
    });


    await caso(2, 'Conservar el resto del contenido al convertir', '<workbook/>', async () => {
        const zip = await JSZip.loadAsync(await aPlantilla(await excelMinimo(), 'xltx'));
        return (await zip.file('xl/workbook.xml')?.async('string')) ?? '';
    });


    await caso(3, 'No tocar un Excel común', 'sin cambios', async () => {
        const original = await excelMinimo();
        const resultado = await aPlantilla(original, 'xlsx');
        comprobar(resultado === original, 'Se modificó un archivo que no es plantilla');
        return 'sin cambios';
    });


    await caso(4, 'Rechazar un archivo que no es de Office', 'Error: El archivo que devolvió Drive no es un documento de Office válido.', async () => {
        const zip = new JSZip();
        zip.file('otro.txt', 'hola');
        const sinTipos = await zip.generateAsync({ type: 'nodebuffer' });
        await esperarError(() => aPlantilla(sinTipos, 'xltx'),
            'El archivo que devolvió Drive no es un documento de Office válido.');
        return 'Error: El archivo que devolvió Drive no es un documento de Office válido.';
    });


    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal) process.exitCode = 1;
}


main().catch((error) => {
    console.error('MAL: Error al ejecutar las pruebas:', error);
    process.exitCode = 1;
});