// Prueba alcance.ts junto con permisos.ts reales (sin mocks), solo con una base falsa.
import { exigirAcceso, registrarCambioSiProyecto } from '../../logicaPersistente/gestionDeProyectos/alcance';

function baseFalsa() {
    const ejecutar = jest.fn();
    const p = { ejecutar };
    return { p, ejecutar };
}

describe('exigirAcceso + exigirPermiso (integración)', () => {
    it('elemento personal ajeno: rechaza sin consultar la base', async () => {
        const { p, ejecutar } = baseFalsa();
        await expect(exigirAcceso(p as any, null, 5, 6, 'tarea.crear'))
            .rejects.toThrow('No tenés permiso sobre este elemento personal');
        expect(ejecutar).not.toHaveBeenCalled();
    });

    it('proyecto: un editor activo pasa', async () => {
        const { p, ejecutar } = baseFalsa();
        ejecutar.mockResolvedValueOnce([{ rol: 'editor' }]);
        await expect(exigirAcceso(p as any, 10, 5, 6, 'tarea.crear')).resolves.toBeUndefined();
        expect(ejecutar.mock.calls[0][1]).toEqual([10, 6]);
    });

    it('proyecto: un lector no puede editar pero sí leer', async () => {
        const { p, ejecutar } = baseFalsa();
        ejecutar.mockResolvedValue([{ rol: 'lector' }]);
        await expect(exigirAcceso(p as any, 10, 5, 6, 'tarea.crear'))
            .rejects.toThrow('No tenés permisos para esta operación');
        await expect(exigirAcceso(p as any, 10, 5, 6, 'tarea.listar')).resolves.toBeUndefined();
    });

    it('proyecto: un lector sí puede marcar una tarea como hecha', async () => {
        const { p, ejecutar } = baseFalsa();
        ejecutar.mockResolvedValue([{ rol: 'lector' }]);
        await expect(exigirAcceso(p as any, 10, 5, 6, 'tarea.alternar')).resolves.toBeUndefined();
    });

    it('proyecto: quien no es miembro (o fue dado de baja) es rechazado', async () => {
        const { p, ejecutar } = baseFalsa();
        ejecutar.mockResolvedValueOnce([]);
        await expect(exigirAcceso(p as any, 10, 5, 6, 'tarea.listar')).rejects.toThrow('El usuario no es miembro del proyecto');
    });
});

describe('registrarCambioSiProyecto + registrarCambio (integración)', () => {
    it('proyecto: lee id_global, encola el cambio con idGlobal en el payload y sube la versión', async () => {
        const { p, ejecutar } = baseFalsa();
        ejecutar
            .mockResolvedValueOnce([{ id_global: 'g-1' }]) // SELECT id_global
            .mockResolvedValue([]);                        // INSERT cola + UPDATE versión

        await registrarCambioSiProyecto(p as any, 10, 'tarea' as any, 1, 'modificar' as any,
            { completada: true } as any);

        expect(ejecutar).toHaveBeenCalledTimes(3);
        expect(ejecutar.mock.calls[0][0]).toContain('SELECT id_global FROM tareas WHERE id_tarea = $1');
        expect(ejecutar.mock.calls[1][0]).toContain('INSERT INTO cola_sincronizacion');
        expect(JSON.parse((ejecutar.mock.calls[1][1] as unknown[])[4] as string))
            .toEqual({ completada: true, idGlobal: 'g-1' });
        expect(ejecutar.mock.calls[2][0]).toContain('UPDATE proyectos SET version = version + 1');
    });

    it('eliminar: no lee id_global y encola el payload que mandó el caso de uso', async () => {
        const { p, ejecutar } = baseFalsa();
        ejecutar.mockResolvedValue([]);
        await registrarCambioSiProyecto(p as any, 10, 'tarea' as any, 1, 'eliminar' as any,
            { titulo: 'T', idGlobal: 'g-1' } as any);
        expect(ejecutar).toHaveBeenCalledTimes(2);
        expect(JSON.parse((ejecutar.mock.calls[0][1] as unknown[])[4] as string))
            .toEqual({ titulo: 'T', idGlobal: 'g-1' });
    });

    it('elemento personal: no toca la base (no se sincroniza ni sube versión)', async () => {
        const { p, ejecutar } = baseFalsa();
        await registrarCambioSiProyecto(p as any, null, 'tarea' as any, 1, 'crear' as any, {} as any);
        expect(ejecutar).not.toHaveBeenCalled();
    });
});