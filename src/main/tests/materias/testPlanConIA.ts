import { combinarMaterias, leerPlanIASchema, validarMaterias, type Materias } from '../../logicaNoPersistente/ia/esquemas/materias';
import { aMateriasLeidas } from '../../logicaNoPersistente/lectorPlanEstudios/planConIA';

// Tests de la lectura del plan de estudios con IA (sin llamar a la IA: se usan respuestas de ejemplo).
// Se corren con: npx tsx src/main/tests/materias/testPlanConIA.ts

const comprobar = (ok: boolean, mensaje: string): void => {
    if (!ok) throw new Error(mensaje);
};

const errorDe = (accion: () => unknown): string => {
    try {
        accion();
        return 'sin error';
    } catch (e) {
        return `Error: ${(e as Error).message}`;
    }
};

const errorSchema = (r: { success: boolean; error?: { issues: { message: string }[] } }): string =>
    r.success ? 'aceptado' : `Error: ${r.error!.issues[0].message}`;

const PLAN = `Primer año
Análisis Matemático I (1C)
Álgebra y Geometría Analítica (1C)
Física I (2C)
Segundo año
Análisis Matemático II - correlativas: Análisis Matemático I, Álgebra y Geometría Analítica
Física II - correlativa: Física I`;

const materia = (nombre: string, anio: number | null = 1, cuatrimestre: 'primero' | 'segundo' | 'anual' | null = 'primero', correlativas: string[] = []) =>
    ({ nombre, anio, cuatrimestre, correlativas });

const nombres = (m: Materias) => m.materias.map((x) => x.nombre).join(' │ ');

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

    await caso(1, 'Aceptar las materias que aparecen en el plan', 'Análisis Matemático I │ Física I', () =>
        nombres(validarMaterias({ materias: [materia('Análisis Matemático I'), materia('Física I', 1, 'segundo')] }, PLAN)));

    await caso(2, 'Descartar materias que la IA inventó', 'Física I', () =>
        nombres(validarMaterias({ materias: [materia('Física I'), materia('Programación Avanzada')] }, PLAN)));

    await caso(3, 'No repetir una materia escrita distinto', 'Física I', () =>
        nombres(validarMaterias({ materias: [materia('Física I'), materia('FÍSICA  I')] }, PLAN)));

    await caso(4, 'Sacar una materia de sus propias correlativas', 'Física II ← Física I', () => {
        const [m] = validarMaterias({ materias: [materia('Física II', 2, null, ['Física II', 'Física I', ' Física I '])] }, PLAN).materias;
        return `${m.nombre} ← ${m.correlativas.join(', ')}`;
    });

    await caso(5, 'Error si ninguna materia aparece en el plan', 'Error: Ninguna materia aparece en el texto del plan', () =>
        errorDe(() => validarMaterias({ materias: [materia('Base de Datos')] }, PLAN)));

    await caso(6, 'Unir lo que devolvió cada parte del plan', 'Análisis Matemático I │ Física I │ Física II', () =>
        nombres(combinarMaterias([
            { materias: [materia('Análisis Matemático I'), materia('Física I', 1, 'segundo')] },
            { materias: [materia('Física I', 1, 'segundo'), materia('Física II', 2, null, ['Física I'])] },
        ], PLAN)));

    await caso(7, 'Pasar la respuesta de la IA a la lista que se muestra', 'Física II │ 2° año │ sin cuatrimestre │ Física I', () => {
        const [m] = aMateriasLeidas({ materias: [materia('  Física II ', 2, null, ['Física I'])] });
        return `${m.nombre} │ ${m.anio}° año │ ${m.cuatrimestre ?? 'sin cuatrimestre'} │ ${m.correlativas.join(', ')}`;
    });

    await caso(8, 'Rechazar una respuesta de la IA con año fuera de rango', 'rechazada', () =>
        errorDe(() => aMateriasLeidas({ materias: [materia('Física I', 11)] })) === 'sin error' ? 'aceptada' : 'rechazada');

    await caso(9, 'Rechazar una respuesta de la IA sin materias', 'rechazada', () =>
        errorDe(() => aMateriasLeidas({ materias: [] })) === 'sin error' ? 'aceptada' : 'rechazada');

    await caso(10, 'Pedir que se pegue el texto del plan', 'Error: Pegá el texto del plan.', () =>
        errorSchema(leerPlanIASchema.safeParse({ trabajoId: crypto.randomUUID(), texto: '   ' })));

    await caso(11, 'Rechazar un plan demasiado largo', 'Error: El texto es demasiado largo.', () =>
        errorSchema(leerPlanIASchema.safeParse({ trabajoId: crypto.randomUUID(), texto: 'a'.repeat(50001) })));

    await caso(12, 'Rechazar un identificador de trabajo inválido', 'Error: Identificador de trabajo inválido.', () =>
        errorSchema(leerPlanIASchema.safeParse({ trabajoId: '123', texto: PLAN })));

    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal > 0) process.exitCode = 1;
}

main();
