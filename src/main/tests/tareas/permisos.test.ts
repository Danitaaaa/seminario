import { obtenerRolActivo, exigirRol, registrarCambio } from '../../logicaPersistente/gestionDeProyectos/permisos';
import { IPersistenciaProyectos } from '../../logicaPersistente/gestionDeProyectos/interfacesSincronizacion';

function persistenciaFalsa() {
    const ejecutar = jest.fn();
    const p = { ejecutar };
    return { p: p, ejecutar };
}

describe('obtenerRolActivo', () => {
    it('devuelve el rol del miembro activo', async () => {
        const res = persistenciaFalsa();
        const p = res.p;
        const ejecutar = res.ejecutar;
        ejecutar.mockResolvedValueOnce([{ rol: 'editor' }]);
        await expect(obtenerRolActivo(p as unknown as IPersistenciaProyectos, 10, 5)).resolves.toBe('editor');
        expect(ejecutar).toHaveBeenCalledTimes(1);
    });

    it('consulta por proyecto y usuario, solo membresías sin fecha de baja', async () => {
        const res = persistenciaFalsa();
        const p = res.p;
        const ejecutar = res.ejecutar;
        ejecutar.mockResolvedValueOnce([]);
        await obtenerRolActivo(p as unknown as IPersistenciaProyectos, 10, 5);
        const [sql, params] = ejecutar.mock.calls[0];
        expect(sql).toContain('FROM proyecto_miembros');
        expect(sql).toContain('id_proyecto = $1 AND id_usuario = $2');
        expect(sql).toContain('fecha_baja IS NULL');
        expect(params).toEqual([10, 5]);
    });

    it('devuelve null si no es miembro (sin filas)', async () => {
        const res = persistenciaFalsa();
        ejecutarMock(res.ejecutar, []);
        await expect(obtenerRolActivo(res.p as unknown as IPersistenciaProyectos, 10, 5)).resolves.toBeNull();
    });

    it('devuelve null si la fila no trae rol', async () => {
        const res = persistenciaFalsa();
        res.ejecutar.mockResolvedValueOnce([{ rol: null }]);
        await expect(obtenerRolActivo(res.p as unknown as IPersistenciaProyectos, 10, 5)).resolves.toBeNull();
    });

    it('propaga errores de la base', async () => {
        const res = persistenciaFalsa();
        res.ejecutar.mockRejectedValueOnce(new Error('db caída'));
        await expect(obtenerRolActivo(res.p as unknown as IPersistenciaProyectos, 10, 5)).rejects.toThrow('db caída');
    });
});

function ejecutarMock(ejecutar: jest.Mock, val: any) {
    ejecutar.mockResolvedValueOnce(val);
}

describe('exigirRol', () => {
    it.each(['propietario', 'editor', 'lector'])('devuelve el rol "%s" si está permitido', async rol => {
        const res = persistenciaFalsa();
        res.ejecutar.mockResolvedValueOnce([{ rol }]);
        await expect(exigirRol(res.p as unknown as IPersistenciaProyectos, 10, 5, ['propietario', 'editor', 'lector'])).resolves.toBe(rol);
    });

    it('lanza si el usuario no es miembro', async () => {
        const res = persistenciaFalsa();
        res.ejecutar.mockResolvedValueOnce([]);
        await expect(exigirRol(res.p as unknown as IPersistenciaProyectos, 10, 5, ['propietario'])).rejects.toThrow('El usuario no es miembro del proyecto');
    });

    it('lanza si el rol no está entre los permitidos', async () => {
        const res = persistenciaFalsa();
        res.ejecutar.mockResolvedValueOnce([{ rol: 'lector' }]);
        await expect(exigirRol(res.p as unknown as IPersistenciaProyectos, 10, 5, ['propietario', 'editor']))
            .rejects.toThrow('No tenés permisos para esta operación');
    });

    it('con lista de permitidos vacía siempre rechaza a un miembro', async () => {
        const res = persistenciaFalsa();
        res.ejecutar.mockResolvedValueOnce([{ rol: 'propietario' }]);
        await expect(exigirRol(res.p as unknown as IPersistenciaProyectos, 10, 5, [])).rejects.toThrow('No tenés permisos para esta operación');
    });

    it('el mensaje de "no miembro" tiene prioridad sobre el de permisos', async () => {
        const res = persistenciaFalsa();
        res.ejecutar.mockResolvedValueOnce([]);
        await expect(exigirRol(res.p as unknown as IPersistenciaProyectos, 10, 5, [])).rejects.toThrow('El usuario no es miembro del proyecto');
    });

    it('pasa proyecto y usuario a la consulta', async () => {
        const res = persistenciaFalsa();
        res.ejecutar.mockResolvedValueOnce([{ rol: 'editor' }]);
        await exigirRol(res.p as unknown as IPersistenciaProyectos, 77, 88, ['editor']);
        expect(res.ejecutar.mock.calls[0][1]).toEqual([77, 88]);
    });
});

describe('registrarCambio', () => {
    it('inserta en la cola y luego sube la versión del proyecto (en ese orden)', async () => {
        const res = persistenciaFalsa();
        res.ejecutar.mockResolvedValue([]);
        await registrarCambio(res.p as unknown as IPersistenciaProyectos, 10, 'tarea' as any, 4, 'crear' as any, { titulo: 'T' });

        expect(res.ejecutar).toHaveBeenCalledTimes(2);
        const [sql1, params1] = res.ejecutar.mock.calls[0];
        expect(sql1).toContain('INSERT INTO cola_sincronizacion');
        expect(params1).toEqual([10, 'tarea', 4, 'crear', JSON.stringify({ titulo: 'T' })]);

        const [sql2, params2] = res.ejecutar.mock.calls[1];
        expect(sql2).toContain('UPDATE proyectos SET version = version + 1');
        expect(sql2).toContain('WHERE id_proyecto = $1');
        expect(params2).toEqual([10]);
    });

    it('sin payload guarda null', async () => {
        const res = persistenciaFalsa();
        res.ejecutar.mockResolvedValue([]);
        await registrarCambio(res.p as unknown as IPersistenciaProyectos, 10, 'tarea' as any, 4, 'eliminar' as any);
        expect(res.ejecutar.mock.calls[0][1]).toEqual([10, 'tarea', 4, 'eliminar', null]);
    });
});