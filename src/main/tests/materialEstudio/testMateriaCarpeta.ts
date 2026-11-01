import type { Persistencia } from '../../persistencia/persistencia';
import { ModificarNodo } from '../../logicaPersistente/gestionMaterialEstudio/modificarNodo';
import { BuscarNodosPorMateria } from '../../logicaPersistente/gestionMaterialEstudio/buscarNodosPorMateria';
import { ListarContenido } from '../../logicaPersistente/gestionMaterialEstudio/listarContenido';
import { BuscarNodos } from '../../logicaPersistente/gestionMaterialEstudio/buscarNodos';
import { BuscarArchivos } from '../../logicaPersistente/gestionMaterialEstudio/buscarArchivos';
import { ModificarNodoDTOSchema } from '../../logicaPersistente/gestionMaterialEstudio/dto';


const comprobar = (ok: boolean, mensaje: string): void => {
    if (!ok) throw new Error(mensaje);
};

const fila = (id: number, nombre: string, idMateria: number | null) => ({
    id_nodo: id, nombre, fecha_carga: new Date(), ultima_fecha_acceso: new Date(), ultima_fecha_modificacion: new Date(),
    tamaño: '0', id_padre: null, id_materia: idMateria,
});

// Persistencia falsa para Material personal: ninguna carpeta cuelga de un proyecto,
// así que no hay chequeo de permisos. Responde según la consulta.
function persistenciaFalsa(responder: (sql: string, valores: unknown[]) => unknown[] = () => []) {
    const llamadas: [string, unknown[]][] = [];
    const persistencia = {
        async ejecutar(sql: string, valores: unknown[] = []) {
            llamadas.push([sql, valores]);
            return responder(sql, valores);
        },
    } as unknown as Persistencia;
    return { persistencia, llamadas };
}

const actualizacion = (llamadas: [string, unknown[]][]) => llamadas.find(([sql]) => sql.includes('UPDATE nodos'))!;


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

    const actualizar = (sql: string) => (sql.includes('UPDATE nodos') ? [fila(5, 'Física', 1)] : []);

    await caso(1, 'Asociar una carpeta a una materia', 'cambia la materia: true | materia 1', async () => {
        const { persistencia, llamadas } = persistenciaFalsa(actualizar);
        await new ModificarNodo(persistencia).ejecutar({ id: 5, nombre: 'Física', idMateria: 1 });
        const [, v] = actualizacion(llamadas);
        return `cambia la materia: ${v[2]} | materia ${v[3]}`;
    });

    await caso(2, 'Renombrar una carpeta sin tocar su materia', 'cambia la materia: false | nombre Física teoría', async () => {
        const { persistencia, llamadas } = persistenciaFalsa(actualizar);
        await new ModificarNodo(persistencia).ejecutar({ id: 5, nombre: 'Física teoría' });
        const [, v] = actualizacion(llamadas);
        return `cambia la materia: ${v[2]} | nombre ${v[0]}`;
    });

    await caso(3, 'Sacarle la materia a una carpeta', 'cambia la materia: true | materia null', async () => {
        const { persistencia, llamadas } = persistenciaFalsa(actualizar);
        await new ModificarNodo(persistencia).ejecutar({ id: 5, nombre: 'Física', idMateria: null });
        const [, v] = actualizacion(llamadas);
        return `cambia la materia: ${v[2]} | materia ${v[3]}`;
    });

    await caso(4, 'Rechazar un id de materia inválido', 'rechazado', async () =>
        (ModificarNodoDTOSchema.safeParse({ id: 5, nombre: 'Física', idMateria: 0 }).success ? 'aceptado' : 'rechazado'));

    await caso(5, 'Buscar carpetas de una materia en todo el árbol, sin la raíz', 'recursiva | raíz 1 | materia 7 | sin la raíz', async () => {
        const { persistencia, llamadas } = persistenciaFalsa(() => [fila(4, 'Física prácticos', 7)]);
        await new BuscarNodosPorMateria(persistencia).ejecutar(1, 7);
        const [sql, v] = llamadas[0];
        comprobar(sql.includes('WITH RECURSIVE'), 'No recorre las subcarpetas');
        comprobar(sql.includes('id_nodo <> $1'), 'Incluye la carpeta raíz');
        return `recursiva | raíz ${v[0]} | materia ${v[1]} | sin la raíz`;
    });

    await caso(6, 'Listar con filtro de materia: solo carpetas, con el nombre de la materia', 'Física prácticos (Física I) | 0 archivos', async () => {
        const { persistencia } = persistenciaFalsa((sql) => {
            if (sql.includes('WITH RECURSIVE arbol')) return [fila(4, 'Física prácticos', 7)];
            if (sql.includes('FROM materia')) return [{ id_materia: 7, nombre: 'Física I' }];
            return [];
        });
        const listar = new ListarContenido(new BuscarNodos(persistencia), new BuscarArchivos(persistencia), persistencia,
            new BuscarNodosPorMateria(persistencia));
        const elementos = await listar.ejecutar({ idPadre: 1, idMateria: 7, ordenarPor: 'nombre', direccion: 'ASC' });
        const archivos = elementos.filter((e) => e.tipo === 'archivo').length;
        return elementos.filter((e) => e.tipo === 'carpeta').map((e) => `${e.nombre} (${e.materia})`).join(', ') + ` | ${archivos} archivos`;
    });

    await caso(7, 'Listar sin filtro: carpetas con y sin materia', 'Apuntes (sin materia), Física (Física I) | 1 consulta de materias', async () => {
        const { persistencia, llamadas } = persistenciaFalsa((sql) => {
            if (sql.includes('FROM nodos') && !sql.includes('RECURSIVE')) return [fila(2, 'Apuntes', null), fila(3, 'Física', 7)];
            if (sql.includes('FROM materia')) return [{ id_materia: 7, nombre: 'Física I' }];
            return [];
        });
        const listar = new ListarContenido(new BuscarNodos(persistencia), new BuscarArchivos(persistencia), persistencia,
            new BuscarNodosPorMateria(persistencia));
        const elementos = await listar.ejecutar({ idPadre: 1, ordenarPor: 'nombre', direccion: 'ASC' });
        const consultasMaterias = llamadas.filter(([sql]) => sql.includes('FROM materia')).length;
        return elementos.map((e) => `${e.nombre} (${e.materia ?? 'sin materia'})`).join(', ') + ` | ${consultasMaterias} consulta de materias`;
    });

    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal > 0) process.exitCode = 1;
}

main();
