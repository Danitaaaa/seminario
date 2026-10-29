import { exigirAcceso, registrarCambioSiProyecto, filtroAlcance } from '../../logicaPersistente/gestionDeProyectos/alcance';
import * as permisos from '../../logicaPersistente/gestionDeProyectos/permisos';
import { IPersistenciaProyectos } from '../../logicaPersistente/gestionDeProyectos/interfacesSincronizacion';

jest.mock('../../logicaPersistente/gestionDeProyectos/permisos');

const exigirRol = permisos.exigirRol as jest.Mock;
const registrarCambio = permisos.registrarCambio as jest.Mock;

const persistencia = {} as IPersistenciaProyectos;

beforeEach(() => {
    jest.resetAllMocks();
    exigirRol.mockResolvedValue('editor');
    registrarCambio.mockResolvedValue(undefined);
});

describe('exigirAcceso', () => {
    describe('elemento personal (sin proyecto)', () => {
        it.each([[null], [undefined]])('idProyecto=%p: el creador puede operar y no se consulta el rol', async idProyecto => {
            await expect(exigirAcceso(persistencia, idProyecto, 5, 5, ['propietario'])).resolves.toBeUndefined();
            expect(exigirRol).not.toHaveBeenCalled();
        });

        it('otro usuario distinto del creador: lanza', async () => {
            await expect(exigirAcceso(persistencia, null, 5, 6, ['propietario', 'editor']))
                .rejects.toThrow('No tenés permiso sobre este elemento personal');
            expect(exigirRol).not.toHaveBeenCalled();
        });

        it('los roles son irrelevantes: el creador siempre puede, aunque pida solo "lector"', async () => {
            await expect(exigirAcceso(persistencia, null, 5, 5, [])).resolves.toBeUndefined();
        });
    });

    describe('elemento de proyecto', () => {
        it('delega en exigirRol con proyecto, usuario que opera y roles', async () => {
            await exigirAcceso(persistencia, 10, 5, 6, ['propietario', 'editor']);
            expect(exigirRol).toHaveBeenCalledWith(persistencia, 10, 6, ['propietario', 'editor']);
        });

        it('ignora idCreador: no hace falta ser el creador si el rol alcanza', async () => {
            await expect(exigirAcceso(persistencia, 10, 5, 6, ['editor'])).resolves.toBeUndefined();
        });

        it('propaga el rechazo de exigirRol', async () => {
            exigirRol.mockRejectedValue(new Error('No tenés permisos para esta operación'));
            await expect(exigirAcceso(persistencia, 10, 5, 5, ['propietario']))
                .rejects.toThrow('No tenés permisos para esta operación');
        });

        it('idProyecto 0 se trata como proyecto (solo null/undefined son personales)', async () => {
            await exigirAcceso(persistencia, 0, 5, 5, ['editor']);
            expect(exigirRol).toHaveBeenCalledWith(persistencia, 0, 5, ['editor']);
        });
    });
});

describe('registrarCambioSiProyecto', () => {
    const tx = { ejecutar: jest.fn() };
    const txAny = tx as never;

    beforeEach(() => {
        tx.ejecutar.mockReset();
    });

    it.each([[null], [undefined]])('idProyecto=%p: no hace nada', async idProyecto => {
        await registrarCambioSiProyecto(txAny, idProyecto, 'tarea' as never, 1, 'crear' as never, { a: 1 } as never);
        expect(tx.ejecutar).not.toHaveBeenCalled();
        expect(registrarCambio).not.toHaveBeenCalled();
    });

    it.each([
        ['tarea', 'tareas', 'id_tarea'],
        ['evento', 'eventos', 'id'],
        ['meta', 'metas', 'id_meta'],
    ])('crear/modificar "%s": lee id_global de %s y lo agrega al payload', async (entidad, tabla, pk) => {
        tx.ejecutar.mockResolvedValueOnce([{ id_global: 'g-9' }]);
        await registrarCambioSiProyecto(txAny, 10, entidad as never, 9, 'modificar' as never, { titulo: 'T' } as never);

        expect(tx.ejecutar).toHaveBeenCalledWith(`SELECT id_global FROM ${tabla} WHERE ${pk} = $1`, [9]);
        expect(registrarCambio).toHaveBeenCalledWith(txAny, 10, entidad, 9, 'modificar',
            { titulo: 'T', idGlobal: 'g-9' });
    });

    it('también agrega idGlobal en "crear"', async () => {
        tx.ejecutar.mockResolvedValueOnce([{ id_global: 'g-1' }]);
        await registrarCambioSiProyecto(txAny, 10, 'tarea' as never, 1, 'crear' as never, { titulo: 'T' } as never);
        expect(registrarCambio).toHaveBeenCalledWith(txAny, 10, 'tarea', 1, 'crear', { titulo: 'T', idGlobal: 'g-1' });
    });

    it('"eliminar": no consulta y respeta el idGlobal que mandó el caso de uso', async () => {
        const datos = { titulo: 'T', idGlobal: 'g-borrada' };
        await registrarCambioSiProyecto(txAny, 10, 'tarea' as never, 1, 'eliminar' as never, datos as never);
        expect(tx.ejecutar).not.toHaveBeenCalled();
        expect(registrarCambio).toHaveBeenCalledWith(txAny, 10, 'tarea', 1, 'eliminar', datos);
    });

    it('si la fila no existe, registra con los datos originales (sin idGlobal)', async () => {
        tx.ejecutar.mockResolvedValueOnce([]);
        await registrarCambioSiProyecto(txAny, 10, 'tarea' as never, 1, 'modificar' as never, { a: 1 } as never);
        expect(registrarCambio).toHaveBeenCalledWith(txAny, 10, 'tarea', 1, 'modificar', { a: 1 });
    });

    it('sin datos: el payload queda solo con idGlobal', async () => {
        tx.ejecutar.mockResolvedValueOnce([{ id_global: 'g-1' }]);
        await registrarCambioSiProyecto(txAny, 10, 'tarea' as never, 1, 'modificar' as never, undefined as never);
        expect(registrarCambio).toHaveBeenCalledWith(txAny, 10, 'tarea', 1, 'modificar', { idGlobal: 'g-1' });
    });

    it('propaga errores de la consulta y no registra', async () => {
        tx.ejecutar.mockRejectedValueOnce(new Error('db caída'));
        await expect(registrarCambioSiProyecto(txAny, 10, 'tarea' as never, 1, 'modificar' as never, {} as never))
            .rejects.toThrow('db caída');
        expect(registrarCambio).not.toHaveBeenCalled();
    });
});

describe('filtroAlcance', () => {
    it('con proyecto: filtra por proyecto y agrega el id a los valores', () => {
        const valores: unknown[] = [];
        expect(filtroAlcance(valores, 10, 5)).toBe('id_proyecto = $1');
        expect(valores).toEqual([10]);
    });

    it.each([[null], [undefined]])('idProyecto=%p: filtra tareas personales del usuario', idProyecto => {
        const valores: unknown[] = [];
        expect(filtroAlcance(valores, idProyecto, 5)).toBe('id_proyecto IS NULL AND creada_por = $1');
        expect(valores).toEqual([5]);
    });
});