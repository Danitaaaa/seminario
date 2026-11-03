import { obtenerRolActivo, exigirPermiso, registrarCambio } from '../../logicaPersistente/gestionDeProyectos/permisos';
import { IPersistenciaProyectos } from '../../logicaPersistente/gestionDeProyectos/interfacesSincronizacion';

function persistenciaFalsa() {
    const ejecutar = jest.fn();
    const p = { ejecutar };
    return { p, ejecutar };
}

const como = (p: unknown) => p as unknown as IPersistenciaProyectos;

describe('obtenerRolActivo', () => {
    it('devuelve el rol del miembro activo', async () => {
        const { p, ejecutar } = persistenciaFalsa();
        ejecutar.mockResolvedValueOnce([{ rol: 'editor' }]);
        await expect(obtenerRolActivo(como(p), 10, 5)).resolves.toBe('editor');
        expect(ejecutar).toHaveBeenCalledTimes(1);
    });

    it('consulta por proyecto y usuario, solo membresías sin fecha de baja', async () => {
        const { p, ejecutar } = persistenciaFalsa();
        ejecutar.mockResolvedValueOnce([]);
        await obtenerRolActivo(como(p), 10, 5);
        const [sql, params] = ejecutar.mock.calls[0];
        expect(sql).toContain('FROM proyecto_miembros');
        expect(sql).toContain('id_proyecto = $1 AND id_usuario = $2');
        expect(sql).toContain('fecha_baja IS NULL');
        expect(params).toEqual([10, 5]);
    });

    it('devuelve null si no es miembro (sin filas)', async () => {
        const { p, ejecutar } = persistenciaFalsa();
        ejecutar.mockResolvedValueOnce([]);
        await expect(obtenerRolActivo(como(p), 10, 5)).resolves.toBeNull();
    });

    it('devuelve null si la fila no trae rol', async () => {
        const { p, ejecutar } = persistenciaFalsa();
        ejecutar.mockResolvedValueOnce([{ rol: null }]);
        await expect(obtenerRolActivo(como(p), 10, 5)).resolves.toBeNull();
    });

    it('propaga errores de la base', async () => {
        const { p, ejecutar } = persistenciaFalsa();
        ejecutar.mockRejectedValueOnce(new Error('db caída'));
        await expect(obtenerRolActivo(como(p), 10, 5)).rejects.toThrow('db caída');
    });
});

describe('exigirPermiso', () => {
    it.each(['propietario', 'editor', 'lector'])('devuelve el rol "%s" si la acción es de lectura (tarea.listar)', async rol => {
        const { p, ejecutar } = persistenciaFalsa();
        ejecutar.mockResolvedValueOnce([{ rol }]);
        await expect(exigirPermiso(como(p), 10, 5, 'tarea.listar')).resolves.toBe(rol);
    });

    it.each(['propietario', 'editor', 'lector'])('el rol "%s" puede marcar una tarea como hecha (tarea.alternar)', async rol => {
        const { p, ejecutar } = persistenciaFalsa();
        ejecutar.mockResolvedValueOnce([{ rol }]);
        await expect(exigirPermiso(como(p), 10, 5, 'tarea.alternar')).resolves.toBe(rol);
    });

    it('lanza si el usuario no es miembro', async () => {
        const { p, ejecutar } = persistenciaFalsa();
        ejecutar.mockResolvedValueOnce([]);
        await expect(exigirPermiso(como(p), 10, 5, 'proyecto.eliminar')).rejects.toThrow('El usuario no es miembro del proyecto');
    });

    it('lanza si el rol no alcanza para la acción (lector no puede crear tareas)', async () => {
        const { p, ejecutar } = persistenciaFalsa();
        ejecutar.mockResolvedValueOnce([{ rol: 'lector' }]);
        await expect(exigirPermiso(como(p), 10, 5, 'tarea.crear'))
            .rejects.toThrow('No tenés permisos para esta operación');
    });

    it('un editor no puede eliminar el proyecto (solo propietario)', async () => {
        const { p, ejecutar } = persistenciaFalsa();
        ejecutar.mockResolvedValueOnce([{ rol: 'editor' }]);
        await expect(exigirPermiso(como(p), 10, 5, 'proyecto.eliminar'))
            .rejects.toThrow('No tenés permisos para esta operación');
    });

    it('rechaza una acción desconocida con un mensaje claro', async () => {
        const { p, ejecutar } = persistenciaFalsa();
        ejecutar.mockResolvedValueOnce([{ rol: 'propietario' }]);
        await expect(exigirPermiso(como(p), 10, 5, 'no.existe' as any)).rejects.toThrow('desconocida');
    });

    it('el mensaje de "no miembro" tiene prioridad sobre el de permisos', async () => {
        const { p, ejecutar } = persistenciaFalsa();
        ejecutar.mockResolvedValueOnce([]);
        await expect(exigirPermiso(como(p), 10, 5, 'proyecto.eliminar')).rejects.toThrow('El usuario no es miembro del proyecto');
    });

    it('pasa proyecto y usuario a la consulta', async () => {
        const { p, ejecutar } = persistenciaFalsa();
        ejecutar.mockResolvedValueOnce([{ rol: 'editor' }]);
        await exigirPermiso(como(p), 77, 88, 'tarea.crear');
        expect(ejecutar.mock.calls[0][1]).toEqual([77, 88]);
    });
});

describe('registrarCambio', () => {
    it('inserta en la cola y luego sube la versión del proyecto (en ese orden)', async () => {
        const { p, ejecutar } = persistenciaFalsa();
        ejecutar.mockResolvedValue([]);
        await registrarCambio(como(p), 10, 'tarea' as any, 4, 'crear' as any, { titulo: 'T' });

        expect(ejecutar).toHaveBeenCalledTimes(2);
        const [sql1, params1] = ejecutar.mock.calls[0];
        expect(sql1).toContain('INSERT INTO cola_sincronizacion');
        expect(params1).toEqual([10, 'tarea', 4, 'crear', JSON.stringify({ titulo: 'T' })]);

        const [sql2, params2] = ejecutar.mock.calls[1];
        expect(sql2).toContain('UPDATE proyectos SET version = version + 1');
        expect(sql2).toContain('WHERE id_proyecto = $1');
        expect(params2).toEqual([10]);
    });

    it('sin payload guarda null', async () => {
        const { p, ejecutar } = persistenciaFalsa();
        ejecutar.mockResolvedValue([]);
        await registrarCambio(como(p), 10, 'tarea' as any, 4, 'eliminar' as any);
        expect(ejecutar.mock.calls[0][1]).toEqual([10, 'tarea', 4, 'eliminar', null]);
    });
});