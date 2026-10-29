import { ModificarTarea } from '../../logicaPersistente/gestionDeTareas/modificarTarea';
import { crearPersistenciaFalsa, filaTarea } from './pruebasComunes';
import { consultasA } from './persistenciaPorSql';
import * as alcance from '../../logicaPersistente/gestionDeProyectos/alcance';

jest.mock('../../logicaPersistente/gestionDeProyectos/alcance', () => ({
    exigirAcceso: jest.fn(),
    registrarCambioSiProyecto: jest.fn(),
    filtroAlcance: jest.fn(),
}));

const exigirAcceso = alcance.exigirAcceso as jest.Mock;
const registrarCambio = alcance.registrarCambioSiProyecto as jest.Mock;

beforeEach(() => {
    jest.resetAllMocks();
    exigirAcceso.mockResolvedValue(undefined);
    registrarCambio.mockResolvedValue(undefined);
});

describe('ModificarTarea', () => {
    describe('campos modificados (tests 88 y 89)', () => {
        it('actualiza solo el título', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa([[filaTarea()], [filaTarea({ titulo: 'Nuevo' })]]);
            const t = await new ModificarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, titulo: 'Nuevo' });
            expect(t.titulo).toBe('Nuevo');
            const [sql, valores] = ejecutar.mock.calls[1];
            expect(sql).toContain('UPDATE tareas SET titulo = $1');
            expect(valores).toEqual(['Nuevo', 1]);
        });

        it('actualiza título, descripción, prioridad y fecha límite en una sola sentencia', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa([[filaTarea()], [filaTarea()]]);
            await new ModificarTarea(persistencia).ejecutar({
                idTarea: 1, idUsuario: 5, titulo: 'N', descripcion: 'd', prioridad: 'alta', fechaLimite: '2026-12-01',
            });
            const updates = consultasA(ejecutar, /^\s*UPDATE tareas/i);
            expect(updates).toHaveLength(1);
            const [sql, valores] = updates[0] as [string, unknown[]];
            expect(sql).toMatch(/titulo\s*=/);
            expect(sql).toMatch(/descripcion\s*=/);
            expect(sql).toMatch(/prioridad\s*=/);
            expect(sql).toMatch(/fecha_limite\s*=/);
            expect(valores).toEqual(expect.arrayContaining(['N', 'd', 'alta', '2026-12-01']));
            expect(valores[valores.length - 1]).toBe(1);      // el id va al final
        });

        it('la tarea mantiene su columna y su posición: no toca id_asignado, orden ni completada', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa([[filaTarea()], [filaTarea()]]);
            await new ModificarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, titulo: 'N', prioridad: 'baja' });
            const sql = ejecutar.mock.calls[1][0];
            expect(sql).not.toMatch(/\borden\s*=/i);
            expect(sql).not.toMatch(/id_asignado\s*=/i);
            expect(sql).not.toMatch(/completada\s*=/i);
        });

        it('89: quitar descripción y fecha límite las deja en null sin tocar el resto', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa([
                [filaTarea({ descripcion: 'x', fecha_limite: '2026-12-01' })], [filaTarea()],
            ]);
            await new ModificarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, descripcion: null, fechaLimite: null });
            const [sql, valores] = ejecutar.mock.calls[1];
            expect(sql).toMatch(/descripcion\s*=/);
            expect(sql).toMatch(/fecha_limite\s*=/);
            expect(sql).not.toMatch(/titulo\s*=/);
            expect(sql).not.toMatch(/prioridad\s*=/);
            expect(valores.filter(v => v === null)).toHaveLength(2);
        });

        it('sin ningún campo para cambiar no actualiza ni registra nada', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa([[filaTarea({ titulo: 'Igual' })]]);
            const t = await new ModificarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5 });
            expect(t.titulo).toBe('Igual');
            expect(consultasA(ejecutar, /^\s*UPDATE/i)).toHaveLength(0);
            expect(registrarCambio).not.toHaveBeenCalled();
        });

        it('un campo no enviado no se modifica (undefined es distinto de null)', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa([[filaTarea()], [filaTarea()]]);
            await new ModificarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, titulo: 'N' });
            expect(ejecutar.mock.calls[1][0]).not.toMatch(/descripcion\s*=|fecha_limite\s*=/);
        });
    });

    describe('sincronización', () => {
        it('registra el cambio solo con los campos modificados', async () => {
            const { persistencia, tx } = crearPersistenciaFalsa([
                [filaTarea({ id_tarea: 3 })], [filaTarea({ id_tarea: 3 })],
            ]);
            await new ModificarTarea(persistencia).ejecutar({ idTarea: 3, idUsuario: 5, titulo: 'N', fechaLimite: null });
            expect(registrarCambio).toHaveBeenCalledWith(tx, 10, 'tarea', 3, 'modificar', { titulo: 'N', fechaLimite: null });
        });

        it('no registra el idUsuario ni el idTarea dentro del payload', async () => {
            const { persistencia } = crearPersistenciaFalsa([[filaTarea()], [filaTarea()]]);
            await new ModificarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, prioridad: 'alta' });
            expect(registrarCambio.mock.calls[0][5]).toEqual({ prioridad: 'alta' });
        });
    });

    describe('permisos (test 90 y regla Crear/Modificar/Eliminar tarea)', () => {
        it('exige propietario o editor y excluye al lector', async () => {
            const { persistencia } = crearPersistenciaFalsa([[filaTarea()], [filaTarea()]]);
            await new ModificarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, titulo: 'N' });
            const roles = exigirAcceso.mock.calls[0][4] as string[];
            expect(roles).toEqual(expect.arrayContaining(['propietario', 'editor']));
            expect(roles).not.toContain('lector');
        });

        it('90: valida contra el creador de la tarea, no contra quien modifica (un editor puede modificar la del propietario)', async () => {
            const { persistencia } = crearPersistenciaFalsa([
                [filaTarea({ id_proyecto: 10, creada_por: 1 })], [filaTarea({ id_proyecto: 10, creada_por: 1 })],
            ]);
            await new ModificarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, titulo: 'N' });
            expect(exigirAcceso).toHaveBeenCalledWith(persistencia, 10, 1, 5, expect.any(Array));
        });

        it('si no tiene acceso propaga el error y no modifica ni registra nada', async () => {
            exigirAcceso.mockRejectedValue(new Error('No tenés permisos para esta operación'));
            const { persistencia, ejecutar } = crearPersistenciaFalsa([[filaTarea()]]);
            await expect(new ModificarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, titulo: 'N' }))
                .rejects.toThrow('No tenés permisos para esta operación');
            expect(consultasA(ejecutar, /^\s*UPDATE/i)).toHaveLength(0);
            expect(registrarCambio).not.toHaveBeenCalled();
        });

        it('tarea personal: valida con idProyecto null', async () => {
            const { persistencia } = crearPersistenciaFalsa([
                [filaTarea({ id_proyecto: null, creada_por: 5 })], [filaTarea({ id_proyecto: null })],
            ]);
            await new ModificarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, titulo: 'N' });
            expect(exigirAcceso.mock.calls[0][1]).toBeNull();
        });
    });

    describe('errores', () => {
        it('si la tarea no existe lanza error y no modifica nada', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa([[]]);
            await expect(new ModificarTarea(persistencia).ejecutar({ idTarea: 999, idUsuario: 5, titulo: 'N' }))
                .rejects.toThrow(/no existe/i);
            expect(consultasA(ejecutar, /^\s*UPDATE/i)).toHaveLength(0);
            expect(registrarCambio).not.toHaveBeenCalled();
        });

        it('si la tarea desaparece antes del UPDATE lanza error y no registra el cambio', async () => {
            const { persistencia } = crearPersistenciaFalsa([[filaTarea()], []]);
            await expect(new ModificarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, titulo: 'N' }))
                .rejects.toThrow(/no existe/i);
            expect(registrarCambio).not.toHaveBeenCalled();
        });

        it('propaga errores de la base y no registra el cambio', async () => {
            const { persistencia } = crearPersistenciaFalsa([[filaTarea()], new Error('db caída')]);
            await expect(new ModificarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, titulo: 'N' }))
                .rejects.toThrow('db caída');
            expect(registrarCambio).not.toHaveBeenCalled();
        });
    });
});