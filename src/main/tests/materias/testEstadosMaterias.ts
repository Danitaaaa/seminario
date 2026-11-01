import { estadoInicial, textoDuracion } from '../../../renderer/src/pages/materias/utilidadesMaterias';
import { materiasParaSesion } from '../../../renderer/src/pages/sesionesEstudio/utilidades';


const comprobar = (ok: boolean, mensaje: string): void => {
    if (!ok) throw new Error(mensaje);
};

// Situación de ejemplo: cursa 3° año, 2do cuatrimestre. Lo ya cursado queda "libre".
const EN_TERCERO_2C = { anioActual: 3, cuatrimestreActual: 'segundo' as const };
const EN_TERCERO_1C = { anioActual: 3, cuatrimestreActual: 'primero' as const };


async function main(): Promise<void> {
    let bien = 0;
    let mal = 0;

    const caso = async (id: number, nombre: string, esperada: string, prueba: () => string) => {
        console.log(`\nID: ${id}\nNombre: ${nombre}\nSalida esperada: ${esperada}`);
        try {
            const obtenida = prueba();
            comprobar(obtenida === esperada, `Se obtuvo "${obtenida}"`);
            bien++;
            console.log(`Salida obtenida: ${obtenida}\nBIEN: ${nombre}`);
        } catch (error) {
            mal++;
            console.error(`Salida obtenida: ${String(error)}\nMAL: ${nombre}`);
        }
    };

    await caso(1, 'Materia de un año anterior toma el estado elegido', 'libre', () =>
        estadoInicial(2, 'segundo', EN_TERCERO_2C, 'libre'));

    await caso(2, 'Materia de un año siguiente sale No cursada', 'no_cursada', () =>
        estadoInicial(4, 'primero', EN_TERCERO_2C, 'libre'));

    await caso(3, 'En el 2do cuatrimestre, las del 1ro del año actual ya se cursaron', 'libre', () =>
        estadoInicial(3, 'primero', EN_TERCERO_2C, 'libre'));

    await caso(4, 'En el 2do cuatrimestre, las del 2do están en curso', 'cursando', () =>
        estadoInicial(3, 'segundo', EN_TERCERO_2C, 'libre'));

    await caso(5, 'Las anuales del año actual están en curso', 'cursando', () =>
        estadoInicial(3, 'anual', EN_TERCERO_2C, 'libre'));

    await caso(6, 'En el 1er cuatrimestre, las del 2do todavía no se cursaron', 'no_cursada', () =>
        estadoInicial(3, 'segundo', EN_TERCERO_1C, 'libre'));

    await caso(7, 'Sin año actual cargado se usa el estado elegido', 'regular', () =>
        estadoInicial(5, 'primero', { anioActual: null, cuatrimestreActual: null }, 'regular'));

    await caso(8, 'Mostrar la duración con medios años', '2 años y medio | 1 año | medio año | 5 años', () =>
        [2.5, 1, 0.5, 5].map(textoDuracion).join(' | '));

    await caso(9, 'Selector de sesiones: primero las que cursa, después las que tiene para rendir', 'Cursando ahora: Probabilidad, Diseño | Para rendir · ISI · 2° año: Física II, Sintaxis', () =>
        materiasParaSesion([
            { nombre: 'Álgebra', estado: 'aprobada', grupo: 'ISI · 1° año' },
            { nombre: 'Física II', estado: 'libre', grupo: 'ISI · 2° año' },
            { nombre: 'Sintaxis', estado: 'regular', grupo: 'ISI · 2° año' },
            { nombre: 'Probabilidad', estado: 'cursando', grupo: 'ISI · 3° año' },
            { nombre: 'Diseño', estado: 'cursando', grupo: 'ISI · 3° año' },
            { nombre: 'Redes', estado: 'no_cursada', grupo: 'ISI · 4° año' },
        ]).map((g) => `${g.grupo}: ${g.materias.map((m) => m.nombre).join(', ')}`).join(' | '));

    await caso(10, 'Selector de sesiones: las materias viejas sin formación siguen apareciendo', 'Materia vieja', () =>
        materiasParaSesion([{ nombre: 'Materia vieja', estado: 'no_cursada', grupo: null }])
            .flatMap((g) => g.materias.map((m) => m.nombre)).join(', '));

    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal > 0) process.exitCode = 1;
}

main();
