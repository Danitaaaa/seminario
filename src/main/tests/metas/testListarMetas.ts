import type { Persistencia } from '../../persistencia/persistencia';
import { ListarMetasDTOSchema, CrearMetaDTOSchema } from '../../logicaPersistente/gestionDeMetas/dto';
import { ListarMetas } from '../../logicaPersistente/gestionDeMetas/listarMetas';


const comprobar = (ok: boolean, mensaje: string): void => {
    if (!ok) throw new Error(mensaje);
};

const errorDe = (r: { success: boolean; error?: { issues: { message: string }[] } }): string =>
    r.success ? 'aceptado' : `Error: ${r.error!.issues[0].message}`;


// Persistencia falsa: no devuelve filas y guarda la consulta que recibió.
function persistenciaFalsa() {
    const llamadas: [string, unknown[]][] = [];
    const persistencia = {
        async ejecutar(sql: string, valores: unknown[] = []) {
            llamadas.push([sql, valores]);
            return [];
        },
    } as unknown as Persistencia;
    return { persistencia, llamadas };
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

    await caso(1, 'Listar metas sin mes ni rango de fechas', 'Error: Indicá un mes o un rango de fechas. | mes aceptado | rango aceptado', async () => {
        const sinNada = errorDe(ListarMetasDTOSchema.safeParse({ idUsuario: 7 }));
        const soloDesde = errorDe(ListarMetasDTOSchema.safeParse({ idUsuario: 7, desde: '2026-10-01' }));
        comprobar(sinNada === soloDesde, 'Solo "desde" debería rechazarse igual');
        const mes = errorDe(ListarMetasDTOSchema.safeParse({ idUsuario: 7, mes: '2026-10' }));
        const rango = errorDe(ListarMetasDTOSchema.safeParse({ idUsuario: 7, desde: '2026-10-01', hasta: '2026-10-31' }));
        return `${sinNada} | mes ${mes} | rango ${rango}`;
    });

    await caso(2, 'Crear meta con fecha límite inválida', 'con fecha aceptado | sin fecha aceptado | 15/10/2026 Error: La fecha no es válida.', async () => {
        const base = { idUsuario: 7, titulo: 'Leer capítulo 3', mes: '2026-10' };
        const conFecha = errorDe(CrearMetaDTOSchema.safeParse({ ...base, fechaLimite: '2026-10-15' }));
        const sinFecha = errorDe(CrearMetaDTOSchema.safeParse({ ...base, fechaLimite: null }));
        const invalida = errorDe(CrearMetaDTOSchema.safeParse({ ...base, fechaLimite: '15/10/2026' }));
        return `con fecha ${conFecha} | sin fecha ${sinFecha} | 15/10/2026 ${invalida}`;
    });

    await caso(3, 'Listar las metas del mes', 'metas personales del usuario 7, del mes, en su orden', async () => {
        const { persistencia, llamadas } = persistenciaFalsa();
        await new ListarMetas(persistencia).ejecutar({ idUsuario: 7, mes: '2026-10' });
        const [sql, valores] = llamadas[0];
        comprobar(/id_proyecto IS NULL AND id_usuario = \$1/.test(sql), 'No filtra metas personales');
        comprobar(/mes = \$2::date/.test(sql), 'No filtra por mes');
        comprobar(/ORDER BY orden, id_meta/.test(sql), 'No respeta el orden elegido');
        return `metas personales del usuario ${valores[0]}, del mes, en su orden`;
    });

    await caso(4, 'Listar metas por rango de fechas', 'vencen entre 2026-10-01 y 2026-10-31, ordenadas por fecha', async () => {
        const { persistencia, llamadas } = persistenciaFalsa();
        await new ListarMetas(persistencia).ejecutar({ idUsuario: 7, desde: '2026-10-01', hasta: '2026-10-31' });
        const [sql, valores] = llamadas[0];
        comprobar(/fecha_limite BETWEEN \$2::date AND \$3::date/.test(sql), 'No filtra por rango');
        comprobar(/ORDER BY fecha_limite/.test(sql), 'No ordena por fecha');
        return `vencen entre ${valores[1]} y ${valores[2]}, ordenadas por fecha`;
    });

    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal > 0) process.exitCode = 1;
}

main();
