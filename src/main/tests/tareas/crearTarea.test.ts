import { CrearTarea } from '../../logicaPersistente/gestionDeTareas/crearTarea';
import { crearPersistenciaFalsa, filaTarea } from './pruebasComunes';
import { persistenciaPorSql, consultasA } from './persistenciaPorSql';
import * as alcance from '../../logicaPersistente/gestionDeProyectos/alcance';

jest.mock('../../logicaPersistente/gestionDeProyectos/alcance', () => ({
    exigirAcceso: jest.fn(),
    registrarCambioSiProyecto: jest.fn(),
    filtroAlcance: jest.fn(),
}));

const exigirAccesoMock = alcance.exigirAcceso as jest.Mock;
const registrarCambioMock = alcance.registrarCambioSiProyecto as jest.Mock;

beforeEach(() => {
    jest.resetAllMocks();
    exigirAccesoMock.mockResolvedValue(undefined);
    registrarCambioMock.mockResolvedValue(undefined);
});

describe('CrearTarea', () => {
    describe('tarea personal', () => {
        it('crea la tarea con orden por usuario y prioridad "media" por defecto', async () => {
            const resp = crearPersistenciaFalsa([
                [{ orden: 3 }],
                [filaTarea({ id_tarea: 11, id_proyecto: null, titulo: 'Comprar', orden: 3, creada_por_global: 5 })],
            ]);
            const t = await new CrearTarea(resp.persistencia).ejecutar({ idUsuario: 5, titulo: 'Comprar' });

            expect(t).toMatchObject({ idTarea: 11, idProyecto: null, titulo: 'Comprar', orden: 3 });
            expect(resp.ejecutar.mock.calls[0][1]).toEqual([5]);
            expect(resp.ejecutar.mock.calls[1][0]).toContain('INSERT INTO tareas');
        });

        it('registra el cambio delegando en registrarCambioSiProyecto con idProyecto null', async () => {
            const resp = crearPersistenciaFalsa([
                [{ orden: 1 }], [filaTarea({ id_tarea: 2, id_proyecto: null, titulo: 'P' })],
            ]);
            await new CrearTarea(resp.persistencia).ejecutar({ idUsuario: 5, titulo: 'P' });
            expect(registrarCambioMock).toHaveBeenCalledWith(resp.tx, null, 'tarea', 2, 'crear',
                { titulo: 'P', idAsignadoGlobal: null });
        });

        it('valida acceso con idProyecto nulo (solo el creador opera sobre lo personal)', async () => {
            const resp = crearPersistenciaFalsa([[{ orden: 1 }], [filaTarea({ id_proyecto: null })]]);
            await new CrearTarea(resp.persistencia).ejecutar({ idUsuario: 5, titulo: 'P' });
            const [, idProyecto, , idUsuario] = exigirAccesoMock.mock.calls[0];
            expect(idProyecto ?? null).toBeNull();
            expect(idUsuario).toBe(5);
        });

        it('una tarea personal no puede crearse asignada a otro usuario', async () => {
            const resp = persistenciaPorSql([
                { cuando: /proyecto_miembros/i, filas: [{ x: 1 }] },
                { cuando: /MAX\s*\(/i, filas: [{ orden: 1 }] },
                { cuando: /^\s*INSERT INTO tareas/i, filas: [filaTarea({ id_proyecto: null, id_asignado_global: 8 })] },
            ]);
            await expect(new CrearTarea(resp.persistencia).ejecutar({ idUsuario: 5, titulo: 'T', idAsignadoGlobal: 8 })).rejects.toThrow();
            expect(consultasA(resp.ejecutar, /^\s*INSERT/i)).toHaveLength(0);
        });
    });

    describe('tarea de proyecto', () => {
        function baseProyecto(esMiembro: boolean, idAsignadoGlobal: number | null, ordenSiguiente = 7) {
            return persistenciaPorSql([
                { cuando: /proyecto_miembros/i, filas: esMiembro ? [{ x: 1 }] : [] },
                { cuando: /MAX\s*\(/i, filas: [{ orden: ordenSiguiente }] },
                {
                    cuando: /^\s*INSERT INTO tareas/i,
                    filas: [filaTarea({
                        id_tarea: 20, id_proyecto: 10, titulo: 'T', id_asignado_global: idAsignadoGlobal, orden: ordenSiguiente,
                    })],
                },
            ]);
        }

        it('85: sin asignar queda con idAsignadoGlobal null al final de la columna "Sin asignar"', async () => {
            const { persistencia, ejecutar, tx } = baseProyecto(true, null, 5);
            const t = await new CrearTarea(persistencia).ejecutar({ idUsuario: 5, idProyecto: 10, titulo: 'T' });
            expect(t).toMatchObject({ idProyecto: 10, idAsignadoGlobal: null, orden: 5 });
            const [orden] = consultasA(ejecutar, /MAX\s*\(/i);
            // "Sin asignar" = id_asignado_global nulo: vale `IS NULL` o la comparación null-safe con el parámetro.
            expect(orden[0]).toMatch(/id_asignado_global\s+(IS\s+NULL|IS\s+NOT\s+DISTINCT\s+FROM\s+\$2)/i);
            expect(orden[1].filter((v: unknown) => v !== null)).toEqual([10]);
            expect(registrarCambioMock).toHaveBeenCalledWith(tx, 10, 'tarea', 20, 'crear', { titulo: 'T', idAsignadoGlobal: null });
        });

        it('86: asignada a un miembro queda al final de la columna de ese miembro', async () => {
            const { persistencia, ejecutar, tx } = baseProyecto(true, 8, 7);
            const t = await new CrearTarea(persistencia).ejecutar({ idUsuario: 5, idProyecto: 10, titulo: 'T', idAsignadoGlobal: 8 });
            expect(t).toMatchObject({ idAsignadoGlobal: 8, orden: 7 });
            const [orden] = consultasA(ejecutar, /MAX\s*\(/i);
            expect(orden[1]).toEqual([10, 8]);
            const [insert] = consultasA(ejecutar, /^\s*INSERT INTO tareas/i);
            expect(insert[1]).toEqual(expect.arrayContaining([10, 8, 7]));
            expect(registrarCambioMock).toHaveBeenCalledWith(tx, 10, 'tarea', 20, 'crear', { titulo: 'T', idAsignadoGlobal: 8 });
        });

        it('no se puede asignar a quien no es miembro activo: no inserta ni registra', async () => {
            const { persistencia, ejecutar } = baseProyecto(false, 8);
            await expect(new CrearTarea(persistencia).ejecutar({ idUsuario: 5, idProyecto: 10, titulo: 'T', idAsignadoGlobal: 8 }))
                .rejects.toThrow();
            expect(consultasA(ejecutar, /^\s*INSERT/i)).toHaveLength(0);
            expect(registrarCambioMock).not.toHaveBeenCalled();
        });

        it('87: exige rol propietario o editor (el lector no puede crear)', async () => {
            const { persistencia } = baseProyecto(true, null);
            await new CrearTarea(persistencia).ejecutar({ idUsuario: 5, idProyecto: 10, titulo: 'T' });
            const [p, idProyecto, , idUsuario, accion] = exigirAccesoMock.mock.calls[0];
            expect(p).toBe(persistencia);
            expect(idProyecto).toBe(10);
            expect(idUsuario).toBe(5);
            expect(accion).toBe('tarea.crear');
        });

        it('87: si el acceso es rechazado propaga el error y no inserta ni registra', async () => {
            exigirAccesoMock.mockRejectedValue(new Error('No tenés permisos para esta operación'));
            const { persistencia, ejecutar } = baseProyecto(true, null);
            await expect(new CrearTarea(persistencia).ejecutar({ idUsuario: 5, idProyecto: 10, titulo: 'T' }))
                .rejects.toThrow('No tenés permisos para esta operación');
            expect(consultasA(ejecutar, /^\s*INSERT/i)).toHaveLength(0);
            expect(registrarCambioMock).not.toHaveBeenCalled();
        });

        it('guarda descripción, prioridad y fecha límite indicadas', async () => {
            const { persistencia, ejecutar } = baseProyecto(true, null);
            await new CrearTarea(persistencia).ejecutar({
                idUsuario: 5, idProyecto: 10, titulo: 'T', descripcion: 'd', prioridad: 'alta', fechaLimite: '2026-12-01',
            });
            const [insert] = consultasA(ejecutar, /^\s*INSERT INTO tareas/i);
            expect(insert[1]).toEqual(expect.arrayContaining(['d', 'alta', '2026-12-01']));
        });

        it('la prioridad por defecto es "media"', async () => {
            const { persistencia, ejecutar } = baseProyecto(true, null);
            await new CrearTarea(persistencia).ejecutar({ idUsuario: 5, idProyecto: 10, titulo: 'T' });
            const [insert] = consultasA(ejecutar, /^\s*INSERT INTO tareas/i);
            expect(insert[1]).toContain('media');
        });

        it('propaga errores de la base y no registra el cambio', async () => {
            const { persistencia, ejecutar } = baseProyecto(true, null);
            ejecutar.mockRejectedValueOnce(new Error('db caída'));
            await expect(new CrearTarea(persistencia).ejecutar({ idUsuario: 5, idProyecto: 10, titulo: 'T' }))
                .rejects.toThrow('db caída');
            expect(registrarCambioMock).not.toHaveBeenCalled();
        });
    });
});