import { ListarTareas } from '../../logicaPersistente/gestionDeTareas/listarTareas';
import { crearPersistenciaFalsa, filaTarea } from './pruebasComunes';
import * as alcance from '../../logicaPersistente/gestionDeProyectos/alcance';

jest.mock('../../logicaPersistente/gestionDeProyectos/alcance', () => ({
    exigirAcceso: jest.fn(),
    registrarCambioSiProyecto: jest.fn(),
    filtroAlcance: jest.fn(),
}));

const exigirAcceso = alcance.exigirAcceso as jest.Mock;
const filtroAlcance = alcance.filtroAlcance as jest.Mock;

beforeEach(() => {
    jest.resetAllMocks();
    exigirAcceso.mockResolvedValue(undefined);
    filtroAlcance.mockImplementation((valores: unknown[], idProyecto: number | null, idUsuario: number) => {
        valores.push(idProyecto ?? idUsuario);
        return 'FILTRO_ALCANCE';
    });
});

describe('ListarTareas', () => {
    describe('listado de un proyecto', () => {
        it('lista las tareas de un proyecto materializadas y en el orden devuelto', async () => {
            const { persistencia } = crearPersistenciaFalsa([[
                filaTarea({ id_tarea: 1, orden: 1 }),
                filaTarea({ id_tarea: 2, orden: 2, titulo: 'B' }),
            ]]);
            const r = await new ListarTareas(persistencia).ejecutar({ idProyecto: 10, idUsuario: 5 });
            expect(r.map(t => t.idTarea)).toEqual([1, 2]);
            expect(r[1].titulo).toBe('B');
        });

        it('proyecto sin tareas devuelve una lista vacía', async () => {
            const { persistencia } = crearPersistenciaFalsa([[]]);
            await expect(new ListarTareas(persistencia).ejecutar({ idProyecto: 10, idUsuario: 5 })).resolves.toEqual([]);
        });

        it('las tareas sin asignar conservan idAsignadoGlobal null, sin importar quién las creó ni quién lista (bug 7)', async () => {
            const { persistencia } = crearPersistenciaFalsa([[
                filaTarea({ id_tarea: 1, id_asignado_global: null, creada_por_global: 1 }),
                filaTarea({ id_tarea: 2, id_asignado_global: 8, creada_por_global: 1 }),
                filaTarea({ id_tarea: 3, id_asignado_global: null, creada_por_global: 8 }),
                filaTarea({ id_tarea: 4, id_asignado_global: 1, creada_por_global: 8 }),
            ]]);
            const r = await new ListarTareas(persistencia).ejecutar({ idProyecto: 10, idUsuario: 8 });
            expect(r.map(t => t.idAsignadoGlobal)).toEqual([null, 8, null, 1]);
        });

        it('lista todas las tareas del proyecto sin filtrar por creador ni por asignado', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa([[]]);
            await new ListarTareas(persistencia).ejecutar({ idProyecto: 10, idUsuario: 5 });
            const [sql, valores] = ejecutar.mock.calls[0];
            expect(sql).toContain('FILTRO_ALCANCE');
            expect(valores).toEqual([10]);
            expect(sql).not.toMatch(/creada_por_global\s*=/i);
            expect(sql).not.toMatch(/WHERE[\s\S]*id_asignado_global\s*(=|<>|!=|IS\s+NOT)/i);
            expect(sql).not.toMatch(/COALESCE\s*\(\s*(t\.)?id_asignado_global/i);
        });

        it('ordena por orden', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa([[]]);
            await new ListarTareas(persistencia).ejecutar({ idProyecto: 10, idUsuario: 5 });
            expect(ejecutar.mock.calls[0][0]).toMatch(/ORDER BY[\s\S]*orden/i);
        });

        it('delega el filtro de alcance con proyecto y usuario', async () => {
            const { persistencia } = crearPersistenciaFalsa([[]]);
            await new ListarTareas(persistencia).ejecutar({ idProyecto: 10, idUsuario: 5 });
            expect(filtroAlcance).toHaveBeenCalledWith(expect.any(Array), 10, 5);
        });
    });

    describe('permisos (consultar: propietario, editor y lector)', () => {
        it('exige acceso con cualquier rol (incluye lector)', async () => {
            const { persistencia } = crearPersistenciaFalsa([[]]);
            await new ListarTareas(persistencia).ejecutar({ idProyecto: 10, idUsuario: 5 });
            expect(exigirAcceso).toHaveBeenCalledWith(persistencia, 10, 5, 5, 'tarea.listar');
        });

        it('si no tiene acceso propaga el error y no consulta las tareas', async () => {
            exigirAcceso.mockRejectedValue(new Error('El usuario no es miembro del proyecto'));
            const { persistencia, ejecutar } = crearPersistenciaFalsa([[filaTarea()]]);
            await expect(new ListarTareas(persistencia).ejecutar({ idProyecto: 10, idUsuario: 5 }))
                .rejects.toThrow('El usuario no es miembro del proyecto');
            expect(ejecutar).not.toHaveBeenCalled();
        });
    });

    describe('listado personal (sin proyecto)', () => {
        it.each([[null], [undefined]])('idProyecto=%p: valida acceso como elemento personal y filtra por el usuario', async idProyecto => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa([[filaTarea({ id_proyecto: null, creada_por_global: 5 })]]);
            const r = await new ListarTareas(persistencia).ejecutar({ idProyecto, idUsuario: 5 });
            expect(r).toHaveLength(1);
            expect(exigirAcceso.mock.calls[0][1] ?? null).toBeNull();
            expect(filtroAlcance).toHaveBeenCalledWith(expect.any(Array), idProyecto ?? null, 5);
            expect(ejecutar.mock.calls[0][1]).toEqual([5]);
        });
    });
});