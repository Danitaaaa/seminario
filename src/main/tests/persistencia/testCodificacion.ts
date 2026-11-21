import { aWin1252, adaptarValores } from '../../persistencia/codificacion';

// Tests de la adaptación de textos para bases en WIN1252 (y del carácter nulo en cualquier base).
// Se corren con: npx tsx src/main/tests/persistencia/testCodificacion.ts

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

    await caso(1, 'Tildes, ñ y comillas del español quedan igual', 'Análisis Matemático “ñandú” — 5€', () =>
        aWin1252('Análisis Matemático “ñandú” — 5€'));

    await caso(2, 'Tilde separada de la letra (archivos de Mac o Drive) se junta', 'Análisis | 8 letras', () => {
        const r = aWin1252('Análisis');
        return `${r} | ${[...r].length} letras`;
    });

    await caso(3, 'Símbolo de fuente de PDF (uso privado) se saca', 'Integral  dx', () =>
        aWin1252('Integral  dx'));

    await caso(4, 'Flechas y signos matemáticos se reemplazan por texto', 'a -> b, x <= 3, y >= 2, z != 0', () =>
        aWin1252('a → b, x ≤ 3, y ≥ 2, z ≠ 0'));

    await caso(5, 'Ligaduras y superíndices pasan a su forma simple', 'fin x²', () =>
        aWin1252('ﬁn x²'));

    await caso(6, 'Letras griegas y emojis quedan como "?"', 'lambda ? ?', () =>
        aWin1252('lambda λ 😀'));

    await caso(7, 'El carácter nulo se saca en una base WIN1252', 'ab', () =>
        aWin1252('a\u0000b'));

    await caso(8, 'En una base UTF8 solo se saca el carácter nulo', 'ab λ', () =>
        String(adaptarValores('a\u0000b λ', true)));

    await caso(9, 'Se adaptan también arrays y objetos que se guardan como JSON', '["?",{"tema":"Poisson ?"},5,null]', () =>
        JSON.stringify(adaptarValores(['λ', { tema: 'Poisson λ' }, 5, null], false)));

    await caso(10, 'Fechas y buffers no se tocan', 'Date | Buffer', () => {
        const [fecha, bytes] = adaptarValores([new Date(0), Buffer.from('x')], false) as unknown[];
        return `${fecha instanceof Date ? 'Date' : typeof fecha} | ${Buffer.isBuffer(bytes) ? 'Buffer' : typeof bytes}`;
    });

    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal > 0) process.exitCode = 1;
}

main();
