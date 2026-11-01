import type { Persistencia } from '../../persistencia/persistencia';
import { CrearFormacion } from '../../logicaPersistente/gestionDeMaterias/crearFormacion';
import { CrearMaterias } from '../../logicaPersistente/gestionDeMaterias/crearMaterias';
import { ModificarMateria } from '../../logicaPersistente/gestionDeMaterias/modificarMateria';
import { EliminarMateria } from '../../logicaPersistente/gestionDeMaterias/eliminarMateria';
import { ListarMateriasUsuario } from '../../logicaPersistente/gestionDeMaterias/listarMateriasUsuario';
import { crearFormacionSchema, crearMateriasSchema } from '../../logicaPersistente/gestionDeMaterias/dto';


const comprobar = (ok: boolean, mensaje: string): void => {
    if (!ok) throw new Error(mensaje);
};

async function esperarError(accion: () => Promise<unknown>, esperado: string): Promise<string> {
    try {
        await accion();
    } catch (error) {
        comprobar(error instanceof Error && error.message === esperado,
            `Se esperaba "${esperado}" y se recibió "${String(error)}"`);
        return `Error: ${esperado}`;
    }
    throw new Error(`Se esperaba el error "${esperado}"`);
}

const errorDe = (r: { success: boolean; error?: { issues: { message: string }[] } }): string =>
    r.success ? 'aceptado' : `Error: ${r.error!.issues[0].message}`;

// Persistencia falsa: cada consulta la responde `responder` y queda guardada para revisarla.
// Las transacciones corren sobre la misma persistencia falsa.
function persistenciaFalsa(responder: (sql: string, valores: unknown[]) => unknown[] | Error = () => []) {
    const llamadas: [string, unknown[]][] = [];
    const persistencia: any = {
        async ejecutar(sql: string, valores: unknown[] = []) {
            llamadas.push([sql, valores]);
            const r = responder(sql, valores);
            if (r instanceof Error) throw r;
            return r;
        },
    };
    persistencia.transaccion = async (trabajo: (tx: unknown) => Promise<unknown>) => trabajo(persistencia);
    return { persistencia: persistencia as Persistencia, llamadas };
}

// Error de Postgres con su código (23505 = repetido, 23503 = referenciado por otra tabla).
const errorPostgres = (code: string) => Object.assign(new Error('error de postgres'), { code });

const filaMateria = (nombre: string) => ({ id_materia: 1, id_formacion: 3, nombre, anio: 1, cuatrimestre: 'primero', estado: 'libre' });
const materia = (nombre: string) => ({ nombre, anio: 1, cuatrimestre: 'primero' as const, estado: 'libre' as const });


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

    const formacion = { usuarioId: 7, tipo: 'grado', nombre: 'Ingeniería en Sistemas' };

    await caso(1, 'Rechazar una formación sin nombre', 'Error: El nombre es obligatorio.', async () =>
        errorDe(crearFormacionSchema.safeParse({ ...formacion, nombre: '   ' })));

    await caso(2, 'Rechazar un tipo de formación desconocido', 'Error: Elegí el tipo de formación.', async () =>
        errorDe(crearFormacionSchema.safeParse({ ...formacion, tipo: 'secundario' })));

    await caso(3, 'Aceptar duración de medio año y rechazar otros decimales', 'aceptado | Error: La duración va en años o medios años (por ejemplo 2,5).', async () =>
        `${errorDe(crearFormacionSchema.safeParse({ ...formacion, duracionAnios: 2.5 }))} | `
        + errorDe(crearFormacionSchema.safeParse({ ...formacion, duracionAnios: 2.3 })));

    await caso(4, 'Aceptar el estado Cursando y rechazar uno inventado', 'aceptado | rechazado', async () => {
        const datos = (estado: string) => ({ usuarioId: 7, idFormacion: 3, materias: [{ nombre: 'Física I', estado }] });
        const otro = crearMateriasSchema.safeParse(datos('aprobadisima'));
        return `${errorDe(crearMateriasSchema.safeParse(datos('cursando')))} | ${otro.success ? 'aceptado' : 'rechazado'}`;
    });

    await caso(5, 'Crear formación guarda el año y el cuatrimestre que cursa', 'año 3 | segundo', async () => {
        const { persistencia, llamadas } = persistenciaFalsa(() => [{ id_formacion: 1, tipo: 'grado', nombre: 'ISI' }]);
        await new CrearFormacion(persistencia).ejecutar(crearFormacionSchema.parse({ ...formacion, anioActual: 3, cuatrimestreActual: 'segundo' }));
        const valores = llamadas[0][1];
        return `año ${valores[6]} | ${valores[7]}`;
    });

    await caso(6, 'No agregar dos veces la misma materia en un pedido', 'Error: La materia "Física I" está repetida. | 0 consultas', async () => {
        const { persistencia, llamadas } = persistenciaFalsa();
        const r = await esperarError(
            () => new CrearMaterias(persistencia).ejecutar({ usuarioId: 7, idFormacion: 3, materias: [materia('Física I'), materia('física i')] }),
            'La materia "Física I" está repetida.');
        return `${r} | ${llamadas.length} consultas`;
    });

    await caso(7, 'No agregar materias en la formación de otro usuario', 'Error: La formación no existe.', async () => {
        const { persistencia } = persistenciaFalsa(() => []); // la formación no es del usuario: no hay fila
        return esperarError(
            () => new CrearMaterias(persistencia).ejecutar({ usuarioId: 8, idFormacion: 3, materias: [materia('Física I')] }),
            'La formación no existe.');
    });

    await caso(8, 'Avisar si la materia ya existe en la formación', 'Error: Ya existe una materia con ese nombre en esta formación.', async () => {
        const { persistencia } = persistenciaFalsa((sql) => (sql.startsWith('INSERT') ? errorPostgres('23505') : [{ '?column?': 1 }]));
        return esperarError(
            () => new CrearMaterias(persistencia).ejecutar({ usuarioId: 7, idFormacion: 3, materias: [materia('Física I')] }),
            'Ya existe una materia con ese nombre en esta formación.');
    });

    await caso(9, 'Agregar todas las materias del plan juntas', '3 materias | 3 INSERT', async () => {
        const { persistencia, llamadas } = persistenciaFalsa((sql, v) => (sql.startsWith('INSERT') ? [filaMateria(String(v[1]))] : [{ '?column?': 1 }]));
        const creadas = await new CrearMaterias(persistencia).ejecutar({
            usuarioId: 7, idFormacion: 3, materias: [materia('Álgebra'), materia('Análisis I'), materia('Física I')],
        });
        return `${creadas.length} materias | ${llamadas.filter(([sql]) => sql.startsWith('INSERT')).length} INSERT`;
    });

    await caso(10, 'No modificar la materia de otro usuario', 'Error: La materia no existe.', async () => {
        const { persistencia } = persistenciaFalsa(() => []);
        return esperarError(
            () => new ModificarMateria(persistencia).ejecutar({ usuarioId: 8, idMateria: 1, ...materia('Hackeada') }),
            'La materia no existe.');
    });

    await caso(11, 'No eliminar una materia que tiene sesiones de estudio', 'Error: Hay sesiones de estudio con esta materia. Cambiales la materia o eliminalas primero.', async () => {
        const { persistencia } = persistenciaFalsa(() => errorPostgres('23503'));
        return esperarError(
            () => new EliminarMateria(persistencia).ejecutar({ usuarioId: 7, idMateria: 1 }),
            'Hay sesiones de estudio con esta materia. Cambiales la materia o eliminalas primero.');
    });

    await caso(12, 'Listar todas las materias del usuario con su carrera y año', 'Física I (ISI · ISI · 1° año) | usuario 7', async () => {
        const { persistencia, llamadas } = persistenciaFalsa(() => [{ id_materia: 1, nombre: 'Física I', formacion: 'ISI', grupo: 'ISI · 1° año' }]);
        const [m] = await new ListarMateriasUsuario(persistencia).ejecutar({ usuarioId: 7 });
        return `${m.nombre} (${m.formacion} · ${m.grupo}) | usuario ${llamadas[0][1][0]}`;
    });

    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal > 0) process.exitCode = 1;
}

main();
