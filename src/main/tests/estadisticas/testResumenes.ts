import type { Persistencia } from '../../persistencia/persistencia';
import { ResumenProyectos } from '../../logicaPersistente/gestionDeEstadisticas/resumenProyectos';
import { ResumenSesionesEstudio } from '../../logicaPersistente/gestionDeEstadisticas/resumenSesiones';
import { ResumenDeMaterial } from '../../logicaPersistente/gestionDeEstadisticas/resumenMaterial';
import {
    resumenProyectosSchema,
    resumenSesionesSchema,
    resumenMaterialSchema,
} from '../../logicaPersistente/gestionDeEstadisticas/dto';


const comprobar = (ok: boolean, mensaje: string): void => {
    if (!ok) throw new Error(mensaje);
};

const igual = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

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

const pedidoProyectos = { idUsuario: 7, mes: '2026-10', hoy: '2026-10-28', desde: '2026-05-01', desfaseMinutos: -180 };


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

    await caso(1, 'Pedir estadísticas de proyectos con mes y día válidos', 'aceptado', async () =>
        errorDe(resumenProyectosSchema.safeParse({ ...pedidoProyectos, idUsuario: 1 })));

    await caso(2, 'Pedir estadísticas con un mes inválido (2026-13)', 'Error: El mes no es válido.', async () =>
        errorDe(resumenProyectosSchema.safeParse({ ...pedidoProyectos, mes: '2026-13' })));

    await caso(3, 'Pedir estadísticas con desfase horario fuera de rango', 'Error: El desfase horario no es válido. | -180 aceptado', async () => {
        const fuera = errorDe(resumenSesionesSchema.safeParse({ idUsuario: 1, desde: '2026-05-01', desfaseMinutos: 900 }));
        const argentina = errorDe(resumenSesionesSchema.safeParse({ idUsuario: 1, desde: '2026-05-01', desfaseMinutos: -180 }));
        return `${fuera} | -180 ${argentina}`;
    });

    await caso(4, 'Resumen de material con usuario inválido (0)', 'Error: El usuario no es válido.', async () =>
        errorDe(resumenMaterialSchema.safeParse({ idUsuario: 0 })));

    await caso(5, 'Estadísticas de un usuario sin proyectos', '[] | 1 consulta', async () => {
        const { persistencia, llamadas } = persistenciaFalsa([[]]);
        const r = await new ResumenProyectos(persistencia).ejecutar(pedidoProyectos);
        comprobar(igual(llamadas[0][1], [7, '2026-10-28', '2026-10']), 'Parámetros incorrectos');
        return `${JSON.stringify(r)} | ${llamadas.length} consulta`;
    });

    await caso(6, 'Armar el resumen de proyectos', 'Seminario: 4 tareas, 2 hechas, 1/3 metas, Dana y Caro, 2 meses | Base de Datos: 1 integrante', async () => {
        const { persistencia, llamadas } = persistenciaFalsa([
            [
                { id_proyecto: 1, nombre: 'Seminario', total: 4, hechas: 2, pendientes: 2, vencidas: 1, sin_asignar: 1, metas_total: 3, metas_completadas: 1 },
                { id_proyecto: 2, nombre: 'Base de Datos', total: 0, hechas: 0, pendientes: 0, vencidas: 0, sin_asignar: 0, metas_total: 0, metas_completadas: 0 },
            ],
            [
                { id_proyecto: 1, id_usuario: 7, nombre: 'Dana', hechas: 2, pendientes: 1 },
                { id_proyecto: 1, id_usuario: 8, nombre: 'Caro', hechas: 0, pendientes: 0 },
                { id_proyecto: 2, id_usuario: 7, nombre: 'Dana', hechas: 0, pendientes: 0 },
            ],
            [
                { id_proyecto: 1, mes: '2026-09', hechas: 1 },
                { id_proyecto: 1, mes: '2026-10', hechas: 1 },
            ],
        ]);
        const [seminario, base] = await new ResumenProyectos(persistencia).ejecutar(pedidoProyectos);
        comprobar(igual(llamadas[2][1], [[1, 2], '2026-05-01', -180]), 'Parámetros por mes incorrectos');
        comprobar(igual(seminario.tareas, { total: 4, hechas: 2, pendientes: 2, vencidas: 1, sinAsignar: 1 }), 'Tareas incorrectas');
        comprobar(base.porMes.length === 0, 'Base de Datos no debería tener meses');
        return `${seminario.nombre}: ${seminario.tareas.total} tareas, ${seminario.tareas.hechas} hechas, `
            + `${seminario.metasMes.completadas}/${seminario.metasMes.total} metas, `
            + `${seminario.integrantes.map((i) => i.nombre).join(' y ')}, ${seminario.porMes.length} meses | `
            + `${base.nombre}: ${base.integrantes.length} integrante`;
    });

    await caso(7, 'Contar solo proyectos donde el usuario sigue activo', 'filtra por fecha_baja IS NULL', async () => {
        const { persistencia, llamadas } = persistenciaFalsa([[]]);
        await new ResumenProyectos(persistencia).ejecutar(pedidoProyectos);
        return /fecha_baja IS NULL/.test(llamadas[0][0]) ? 'filtra por fecha_baja IS NULL' : 'no filtra';
    });

    await caso(8, 'Resumen de sesiones de estudio con hora local', '9 completadas, 2 atrasadas | 742 de 900 min | 15 de 20 objetivos | 2 meses | Física 222 min', async () => {
        const { persistencia, llamadas } = persistenciaFalsa([
            [{ completadas: 9, atrasadas: 2, minutos_estudiados: 742, minutos_planificados: 900 }],
            [{ total: 20, completados: 15 }],
            [{ mes: '2026-09', minutos: 180 }, { mes: '2026-10', minutos: 240 }],
            [{ materia: 'Física', minutos: 222 }],
        ]);
        const r = await new ResumenSesionesEstudio(persistencia).ejecutar({ idUsuario: 7, desde: '2026-05-01', desfaseMinutos: -180 });
        comprobar(llamadas.length === 4, 'Se esperaban 4 consultas');
        for (const [sql, valores] of llamadas) {
            comprobar(igual(valores, [7, '2026-05-01', -180]), 'Parámetros incorrectos');
            comprobar(sql.includes("AT TIME ZONE 'UTC'") && sql.includes('make_interval(mins => $3::int)'), 'No usa la hora local');
        }
        return `${r.sesiones.completadas} completadas, ${r.sesiones.atrasadas} atrasadas | `
            + `${r.minutos.estudiados} de ${r.minutos.planificados} min | `
            + `${r.objetivos.completados} de ${r.objetivos.total} objetivos | `
            + `${r.porMes.length} meses | ${r.porMateria[0].materia} ${r.porMateria[0].minutos} min`;
    });

    await caso(9, 'Descontar el tiempo en pausa de las sesiones', 'descuenta segundos_pausados', async () => {
        const { persistencia, llamadas } = persistenciaFalsa([
            [{ completadas: 0, atrasadas: 0, minutos_estudiados: 0, minutos_planificados: 0 }],
            [{ total: 0, completados: 0 }],
            [],
            [],
        ]);
        await new ResumenSesionesEstudio(persistencia).ejecutar({ idUsuario: 7, desde: '2026-05-01', desfaseMinutos: 0 });
        return llamadas[0][0].includes('segundos_pausados') ? 'descuenta segundos_pausados' : 'no descuenta';
    });

    await caso(10, 'Resumen del material de estudio', '47 archivos | 185783091 bytes (number) | 9 carpetas', async () => {
        const { persistencia, llamadas } = persistenciaFalsa([[{ archivos: 47, bytes: '185783091', carpetas: 9 }]]);
        const r = await new ResumenDeMaterial(persistencia).ejecutar();
        comprobar(llamadas[0][0].includes('WITH RECURSIVE'), 'No recorre las carpetas');
        return `${r.archivos} archivos | ${r.bytes} bytes (${typeof r.bytes}) | ${r.carpetas} carpetas`;
    });

    await caso(11, 'Contar el aporte de cada integrante por su id local, no por el UUID', 'aporte por id_asignado | sin asignar = sin id local ni UUID', async () => {
        const { persistencia, llamadas } = persistenciaFalsa([[{ id_proyecto: 1, nombre: 'Seminario', total: 1, hechas: 0, pendientes: 1,
            vencidas: 0, sin_asignar: 0, metas_total: 0, metas_completadas: 0 }], [], []]);
        await new ResumenProyectos(persistencia).ejecutar(pedidoProyectos);
        comprobar(llamadas[1][0].includes('t.id_asignado = m.id_usuario'), 'El aporte no se cruza por id_asignado');
        comprobar(!/id_asignado_global\s*=\s*m\.id_usuario/.test(llamadas[1][0]), 'Compara el UUID con un número');
        comprobar(llamadas[0][0].includes('t.id_asignado IS NULL AND t.id_asignado_global IS NULL'), 'Sin asignar mal calculado');
        return 'aporte por id_asignado | sin asignar = sin id local ni UUID';
    });

    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal > 0) process.exitCode = 1;
}

main();
