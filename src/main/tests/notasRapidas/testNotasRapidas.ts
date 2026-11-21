import type { Persistencia } from '../../persistencia/persistencia';
import { ListarNotas } from '../../logicaPersistente/gestionDeNotasRapidas/listarNotas';
import { CrearNota } from '../../logicaPersistente/gestionDeNotasRapidas/crearNota';
import { ModificarNota } from '../../logicaPersistente/gestionDeNotasRapidas/modificarNota';
import { EliminarNota } from '../../logicaPersistente/gestionDeNotasRapidas/eliminarNota';
import { crearNotaSchema, modificarNotaSchema } from '../../logicaPersistente/gestionDeNotasRapidas/dto';

// Tests de notas rápidas (post-its de las carpetas). Se corren con: npx tsx src/main/tests/notasRapidas/testNotasRapidas.ts

const comprobar = (ok: boolean, mensaje: string): void => {
    if (!ok) throw new Error(mensaje);
};

const errorDe = (r: { success: boolean; error?: { issues: { message: string }[] } }): string =>
    r.success ? 'aceptado' : `Error: ${r.error!.issues[0].message}`;

// Persistencia falsa: devuelve las respuestas en el orden en que se piden las consultas y guarda lo que recibió.
function persistenciaFalsa(respuestas: unknown[][]) {
    const llamadas: [string, unknown[]][] = [];
    const persistencia = {
        async ejecutar(sql: string, valores: unknown[] = []) {
            llamadas.push([sql, valores]);
            return respuestas[llamadas.length - 1] ?? [];
        },
    } as unknown as Persistencia;
    return { persistencia, llamadas };
}

const fila = { id_nota: 5, id_nodo: 9, texto: 'Falta el TP 3', color: 2, pos_x: 40.5, pos_y: 120, fecha_creacion: new Date('2026-11-20T15:00:00Z') };

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

    await caso(1, 'Crear una nota válida', 'aceptado', async () =>
        errorDe(crearNotaSchema.safeParse({ usuarioId: 1, idNodo: 9, texto: 'Repasar Poisson', color: 1 })));

    await caso(2, 'Crear una nota vacía (solo espacios)', 'Error: Escribí algo en la nota.', async () =>
        errorDe(crearNotaSchema.safeParse({ usuarioId: 1, idNodo: 9, texto: '   ' })));

    await caso(3, 'Crear una nota de más de 300 caracteres', 'Error: La nota no puede superar los 300 caracteres.', async () =>
        errorDe(crearNotaSchema.safeParse({ usuarioId: 1, idNodo: 9, texto: 'a'.repeat(301) })));

    await caso(4, 'Crear una nota con un color que no existe (4)', 'rechazado', async () =>
        (crearNotaSchema.safeParse({ usuarioId: 1, idNodo: 9, texto: 'hola', color: 4 }).success ? 'aceptado' : 'rechazado'));

    await caso(5, 'Si no se elige color, queda el 0', '0', async () => {
        const r = crearNotaSchema.parse({ usuarioId: 1, idNodo: 9, texto: 'hola' });
        return String(r.color);
    });

    await caso(6, 'Mover una nota fuera de la pantalla (x = 120%)', 'rechazado | 0 y 100 aceptados', async () => {
        const fuera = modificarNotaSchema.safeParse({ usuarioId: 1, idNota: 5, posX: 120 }).success;
        const bordes = modificarNotaSchema.safeParse({ usuarioId: 1, idNota: 5, posX: 0, posY: 0 }).success
            && modificarNotaSchema.safeParse({ usuarioId: 1, idNota: 5, posX: 100 }).success;
        return `${fuera ? 'aceptado' : 'rechazado'} | 0 y 100 ${bordes ? 'aceptados' : 'rechazados'}`;
    });

    await caso(7, 'Listar trae solo las notas del usuario en esa carpeta', 'filtra por usuario y carpeta | 1 nota en (40.5, 120)', async () => {
        const { persistencia, llamadas } = persistenciaFalsa([[fila]]);
        const notas = await new ListarNotas(persistencia).ejecutar({ usuarioId: 1, idNodo: 9 });
        comprobar(llamadas[0][0].includes('id_usuario = $1 AND id_nodo = $2'), 'No filtra por usuario y carpeta');
        comprobar(JSON.stringify(llamadas[0][1]) === '[1,9]', 'Valores incorrectos');
        return `filtra por usuario y carpeta | ${notas.length} nota en (${notas[0].posX}, ${notas[0].posY})`;
    });

    await caso(8, 'Crear una nota la guarda y la devuelve', 'Falta el TP 3 | color 2', async () => {
        const { persistencia } = persistenciaFalsa([[{ cantidad: 3 }], [fila]]);
        const nota = await new CrearNota(persistencia).ejecutar({ usuarioId: 1, idNodo: 9, texto: 'Falta el TP 3', color: 2 });
        return `${nota.texto} | color ${nota.color}`;
    });

    await caso(9, 'No deja pasar de 20 notas por carpeta', 'Ya tenés 20 notas en esta carpeta. Borrá alguna para agregar otra. | no guardó', async () => {
        const { persistencia, llamadas } = persistenciaFalsa([[{ cantidad: 20 }]]);
        try {
            await new CrearNota(persistencia).ejecutar({ usuarioId: 1, idNodo: 9, texto: 'una más', color: 0 });
            return 'la creó';
        } catch (e) {
            return `${(e as Error).message} | ${llamadas.length === 1 ? 'no guardó' : 'guardó igual'}`;
        }
    });

    await caso(10, 'Modificar solo la posición no borra el texto ni el color', 'usa COALESCE | [5,1,null,null,40,80]', async () => {
        const { persistencia, llamadas } = persistenciaFalsa([[fila]]);
        await new ModificarNota(persistencia).ejecutar({ usuarioId: 1, idNota: 5, posX: 40, posY: 80 });
        comprobar(llamadas[0][0].includes('COALESCE($3, texto)'), 'Pisa el texto');
        return `usa COALESCE | ${JSON.stringify(llamadas[0][1])}`;
    });

    await caso(11, 'Modificar la nota de otra persona', 'La nota no existe.', async () => {
        const { persistencia } = persistenciaFalsa([[]]);
        try {
            await new ModificarNota(persistencia).ejecutar({ usuarioId: 2, idNota: 5, texto: 'hackeado' });
            return 'la modificó';
        } catch (e) {
            return (e as Error).message;
        }
    });

    await caso(12, 'Eliminar solo borra si la nota es del usuario', 'borra por id y usuario', async () => {
        const { persistencia, llamadas } = persistenciaFalsa([[]]);
        await new EliminarNota(persistencia).ejecutar({ usuarioId: 1, idNota: 5 });
        comprobar(llamadas[0][0].includes('id_nota = $1 AND id_usuario = $2'), 'Borra notas de otros');
        return 'borra por id y usuario';
    });

    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal > 0) process.exitCode = 1;
}

main();
