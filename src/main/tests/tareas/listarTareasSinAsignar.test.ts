// Reproduce el bug: al listar, las tareas sin asignar aparecen para miembros que no son propietarios.
// (Bug exploratorio Nº 7 y tests 85, 86, 93, 94 del módulo de proyectos.)
// Usa alcance.ts y permisos.ts REALES: el rol del usuario que lista viene de la base falsa,
// así que si el listado se comporta distinto según el rol, estos tests lo detectan.
import { ListarTareas } from '../../logicaPersistente/gestionDeTareas/listarTareas';
import { filaTarea } from './pruebasComunes';
import { persistenciaPorSql, consultasA } from './persistenciaPorSql';

type Rol = 'propietario' | 'editor' | 'lector';

const ID_PROYECTO = 10;
const USUARIO_POR_ROL: Record<Rol, number> = { propietario: 1, editor: 2, lector: 3 };

// Escenario deliberadamente variado: el creador NO coincide siempre con el asignado ni con el
// usuario que lista, y hay tareas sin asignar creadas por el propietario y por un editor.
const FILAS = [
    filaTarea({ id_tarea: 1, id_asignado_global: null, creada_por_global: 1, orden: 1, titulo: 'Sin asignar (creó propietario)' }),
    filaTarea({ id_tarea: 2, id_asignado_global: 2, creada_por_global: 1, orden: 1, titulo: 'Asignada al editor' }),
    filaTarea({ id_tarea: 3, id_asignado_global: 3, creada_por_global: 2, orden: 1, titulo: 'Asignada al lector' }),
    filaTarea({ id_tarea: 4, id_asignado_global: null, creada_por_global: 2, orden: 2, titulo: 'Sin asignar (creó editor)' }),
    filaTarea({ id_tarea: 5, id_asignado_global: 1, creada_por_global: 3, orden: 1, titulo: 'Asignada al propietario' }),
];

const ESPERADO = new Map<number, number | null>([[1, null], [2, 2], [3, 3], [4, null], [5, 1]]);

function base(rol: Rol, filas: unknown[] = FILAS) {
    return persistenciaPorSql([
        { cuando: /proyecto_miembros/i, filas: [{ rol }] },
        { cuando: /FROM tareas/i, filas },
    ]);
}

const listar = (rol: Rol, filas?: unknown[]) => {
    const r = base(rol, filas);
    const promesa = new ListarTareas(r.persistencia).ejecutar({ idProyecto: ID_PROYECTO, idUsuario: USUARIO_POR_ROL[rol] });
    return { ...r, promesa };
};

describe('ListarTareas: asignación de las tareas listadas', () => {
    describe.each(['propietario', 'editor', 'lector'] as Rol[])('listando como %s', rol => {
        it('devuelve todas las tareas del proyecto (ninguna se oculta ni se agrega)', async () => {
            const { promesa } = listar(rol);
            const r = await promesa;
            expect(r.map(t => t.idTarea)).toEqual([1, 2, 3, 4, 5]);
        });

        it('cada tarea conserva exactamente su idAsignadoGlobal (las sin asignar siguen en null)', async () => {
            const { promesa } = listar(rol);
            const r = await promesa;
            expect(new Map(r.map(t => [t.idTarea, t.idAsignadoGlobal]))).toEqual(ESPERADO);
        });

        it('las únicas sin asignar son las que realmente no tienen asignado (1 y 4)', async () => {
            const { promesa } = listar(rol);
            const r = await promesa;
            expect(r.filter(t => t.idAsignadoGlobal === null).map(t => t.idTarea)).toEqual([1, 4]);
        });

        it('una tarea sin asignar no queda atribuida al usuario que lista ni a quien la creó', async () => {
            const { promesa } = listar(rol);
            const r = await promesa;
            const sinAsignar = r.filter(t => t.idTarea === 1 || t.idTarea === 4);
            for (const t of sinAsignar) {
                const creador = FILAS.find(f => f.id_tarea === t.idTarea)!.creada_por_global;
                expect(t.idAsignadoGlobal).not.toBe(USUARIO_POR_ROL[rol]);
                expect(t.idAsignadoGlobal).not.toBe(creador);
            }
        });
    });

    it('el resultado es idéntico para propietario, editor y lector', async () => {
        const resultados = await Promise.all((['propietario', 'editor', 'lector'] as Rol[]).map(rol => listar(rol).promesa));
        expect(resultados[1]).toEqual(resultados[0]);
        expect(resultados[2]).toEqual(resultados[0]);
    });

    it('una tarea asignada al propietario no figura como sin asignar (y viceversa)', async () => {
        const r = await listar('lector').promesa;
        expect(r.find(t => t.idTarea === 5)?.idAsignadoGlobal).toBe(1);
        expect(r.find(t => t.idTarea === 1)?.idAsignadoGlobal).toBeNull();
    });

    it('normaliza un id_asignado_global ausente (undefined) a null, no a otro usuario', async () => {
        const fila = filaTarea({ id_tarea: 9, creada_por_global: 2 });
        delete (fila as any).id_asignado_global;
        const [t] = await listar('editor', [fila]).promesa;
        expect(t.idAsignadoGlobal).toBeNull();
    });

    it('conserva el orden devuelto por la base dentro de cada columna', async () => {
        const r = await listar('lector').promesa;
        expect(r.filter(t => t.idAsignadoGlobal === null).map(t => t.orden)).toEqual([1, 2]);
    });
});

describe('ListarTareas: la consulta de un proyecto no depende del usuario que lista', () => {
    it.each(['propietario', 'editor', 'lector'] as Rol[])('%s: filtra solo por proyecto', async rol => {
        const { promesa, ejecutar } = listar(rol);
        await promesa;
        const [consulta] = consultasA(ejecutar, /FROM tareas/i);
        const [sql, valores] = consulta as [string, unknown[]];

        expect(valores).toEqual([ID_PROYECTO]);              // no se agrega el usuario como parámetro
        expect(sql).toMatch(/id_proyecto\s*=\s*\$1/);
        expect(sql).not.toMatch(/creada_por_global\s*=/i);          // no filtra por creador
        expect(sql).not.toMatch(/WHERE[\s\S]*id_asignado_global\s*(=|<>|!=|IS\s+NOT)/i); // no filtra por asignado
    });

    it('no reemplaza id_asignado_global nulo por otro valor en la consulta', async () => {
        const { promesa, ejecutar } = listar('lector');
        await promesa;
        const [sql] = consultasA(ejecutar, /FROM tareas/i)[0] as [string];
        expect(sql).not.toMatch(/COALESCE\s*\(\s*(t\.)?id_asignado_global/i);
        expect(sql).not.toMatch(/CASE[\s\S]*id_asignado_global[\s\S]*END/i);
        expect(sql).not.toMatch(/JOIN/i);                    // un JOIN con miembros/usuarios puede pisar el nulo
    });
});