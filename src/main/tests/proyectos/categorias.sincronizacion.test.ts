import { beforeEach, describe, expect, it } from 'vitest';
import { BDFalsa, UUID } from './fakes';
import { ManejadorCategoria } from '../../logicaPersistente/gestionDeCategorias/manejadorCategoria';
import { CrearCategoria } from '../../logicaPersistente/gestionDeCategorias/crearCategoria';
import { ModificarCategoria } from '../../logicaPersistente/gestionDeCategorias/modificarCategoria';
import { EliminarCategoria } from '../../logicaPersistente/gestionDeCategorias/eliminarCategoria';
import type { CambioPendiente } from '../../logicaPersistente/gestionDeProyectos/entidades';

// Categorías de eventos en proyectos compartidos (test 2 del módulo: cada proyecto tiene sus propias
// categorías). Se sincronizan por la cola, igual que las carpetas: sin bloqueo ni versión.

const cambio = (operacion: CambioPendiente['operacion'], payload: unknown): CambioPendiente => ({
    id: 1, idProyecto: 3, entidad: 'categoria', idEntidad: 0, operacion, payload,
    fechaCambio: new Date(), fechaEnvio: null,
});
const fila = (o: Record<string, unknown> = {}) =>
    ({ id: 9, id_global: UUID, usuario_id: null, id_proyecto: 3, nombre: 'Entregas', ...o });

describe('ManejadorCategoria: aplica los cambios que llegan de otros miembros', () => {
    let bd: BDFalsa;
    beforeEach(() => { bd = new BDFalsa(); });

    it('sin idGlobal no hace nada', async () => {
        await new ManejadorCategoria(bd).aplicarCambio(3, cambio('crear', { datos: { nombre: 'X' } }));
        expect(bd.consultas).toHaveLength(0);
    });

    it('crear: inserta la categoría en el proyecto con el id global remoto', async () => {
        await new ManejadorCategoria(bd).aplicarCambio(3, cambio('crear', { idGlobal: UUID, datos: { nombre: 'Entregas' } }));
        const [insert] = bd.que(/^INSERT INTO categorias/);
        expect(insert.valores).toEqual([UUID, 3, 'Entregas']);
        expect(insert.sql).toContain('ON CONFLICT (id_global) DO NOTHING');
    });

    it('crear sin nombre no inserta', async () => {
        await new ManejadorCategoria(bd).aplicarCambio(3, cambio('crear', { idGlobal: UUID, datos: {} }));
        expect(bd.que(/^INSERT INTO categorias/)).toHaveLength(0);
    });

    it('modificar: si ya existe, la renombra y no inserta otra', async () => {
        bd.sobre(/^UPDATE categorias SET nombre = \$3/, [{ id: 9 }]);
        await new ManejadorCategoria(bd).aplicarCambio(3, cambio('modificar', { idGlobal: UUID, datos: { nombre: 'Parciales' } }));
        expect(bd.que(/^UPDATE categorias SET nombre = \$3/)[0].valores).toEqual([UUID, 3, 'Parciales']);
        expect(bd.que(/^INSERT INTO categorias/)).toHaveLength(0);
    });

    it('la misma categoría creada en dos computadoras sin conexión no se duplica: adopta el id global remoto', async () => {
        bd.sobre(/^UPDATE categorias SET id_global = \$1/, [{ id: 4 }]);
        await new ManejadorCategoria(bd).aplicarCambio(3, cambio('crear', { idGlobal: UUID, datos: { nombre: 'Entregas' } }));
        expect(bd.que(/^UPDATE categorias SET id_global = \$1/)[0].valores).toEqual([UUID, 3, 'Entregas']);
        expect(bd.que(/^INSERT INTO categorias/)).toHaveLength(0);
    });

    it('si el id global ya existe (con otro nombre en uso) no la vuelve a crear', async () => {
        bd.sobre(/^SELECT 1 AS x FROM categorias WHERE id_global = \$1/, [{ x: 1 }]);
        await new ManejadorCategoria(bd).aplicarCambio(3, cambio('modificar', { idGlobal: UUID, datos: { nombre: 'Otra' } }));
        expect(bd.que(/^INSERT INTO categorias/)).toHaveLength(0);
        expect(bd.que(/^UPDATE categorias SET id_global/)).toHaveLength(0);
    });

    it('eliminar: borra solo la categoría de ese proyecto', async () => {
        await new ManejadorCategoria(bd).aplicarCambio(3, cambio('eliminar', { idGlobal: UUID }));
        const [del] = bd.que(/^DELETE FROM categorias/);
        expect(del.sql).toContain('id_proyecto = $2');
        expect(del.valores).toEqual([UUID, 3]);
    });

    it('leer devuelve el nombre de la categoría del proyecto', async () => {
        bd.sobre(/^SELECT nombre FROM categorias/, [{ nombre: 'Entregas' }]);
        await expect(new ManejadorCategoria(bd).leer(3, UUID)).resolves.toEqual({ datos: { nombre: 'Entregas' } });
    });
});

describe('Casos de uso de categorías: registran el cambio solo si son de un proyecto', () => {
    let bd: BDFalsa;
    beforeEach(() => {
        bd = new BDFalsa();
        bd.sobre(/^INSERT INTO categorias \(usuario_id/, (v) => [fila({ usuario_id: v[0], id_proyecto: v[1], nombre: v[2] })]);
        bd.sobre(/^SELECT id_global FROM categorias/, [{ id_global: UUID }]);
    });

    it('crear en un proyecto (editor): queda sin dueño y se encola para sincronizar con su id global', async () => {
        bd.fijarRol(3, 5, 'editor');
        const c = await new CrearCategoria(bd).ejecutar({ usuarioId: 5, idProyecto: 3, nombre: 'Entregas' });
        expect(c).toMatchObject({ idProyecto: 3, usuarioId: null, nombre: 'Entregas' });
        const [cola] = bd.que(/^INSERT INTO cola_sincronizacion/);
        expect(cola.valores.slice(0, 4)).toEqual([3, 'categoria', 9, 'crear']);
        expect(JSON.parse(cola.valores[4] as string)).toEqual({ datos: { nombre: 'Entregas' }, idGlobal: UUID });
    });

    it('crear una categoría personal no encola nada (las personales no se comparten)', async () => {
        const c = await new CrearCategoria(bd).ejecutar({ usuarioId: 5, nombre: 'Facultad' });
        expect(c).toMatchObject({ idProyecto: null, usuarioId: 5 });
        expect(bd.que(/cola_sincronizacion/)).toHaveLength(0);
    });

    it('el lector no puede crear categorías en el proyecto', async () => {
        bd.fijarRol(3, 5, 'lector');
        await expect(new CrearCategoria(bd).ejecutar({ usuarioId: 5, idProyecto: 3, nombre: 'X' }))
            .rejects.toThrow('No tenés permisos para esta operación');
        expect(bd.que(/^INSERT INTO categorias/)).toHaveLength(0);
    });

    it('nombre repetido en el mismo proyecto se informa', async () => {
        // Base nueva: la respuesta del INSERT es un error de clave única.
        bd = new BDFalsa().fijarRol(3, 5, 'editor')
            .sobre(/^INSERT INTO categorias \(usuario_id/, () => { throw Object.assign(new Error('dup'), { code: '23505' }); });
        await expect(new CrearCategoria(bd).ejecutar({ usuarioId: 5, idProyecto: 3, nombre: 'Entregas' }))
            .rejects.toThrow('Ya existe una categoría con ese nombre');
    });

    it('renombrar en un proyecto se encola como "modificar"', async () => {
        bd.fijarRol(3, 5, 'editor');
        bd.sobre(/^SELECT id_proyecto, usuario_id FROM categorias/, [{ id_proyecto: 3, usuario_id: null }]);
        bd.sobre(/^UPDATE categorias/, [fila({ nombre: 'Parciales' })]);
        await new ModificarCategoria(bd).ejecutar({ usuarioId: 5, id: 9, nombre: 'Parciales' });
        const [cola] = bd.que(/^INSERT INTO cola_sincronizacion/);
        expect(cola.valores.slice(0, 4)).toEqual([3, 'categoria', 9, 'modificar']);
    });

    it('eliminar en un proyecto manda el id global (la fila ya no existe)', async () => {
        bd.fijarRol(3, 5, 'editor');
        bd.sobre(/^SELECT id_proyecto, usuario_id FROM categorias/, [{ id_proyecto: 3, usuario_id: null }]);
        bd.sobre(/^DELETE FROM categorias/, [{ id_global: UUID }]);
        await new EliminarCategoria(bd).ejecutar({ usuarioId: 5, id: 9 });
        const [cola] = bd.que(/^INSERT INTO cola_sincronizacion/);
        expect(cola.valores.slice(0, 4)).toEqual([3, 'categoria', 9, 'eliminar']);
        expect(JSON.parse(cola.valores[4] as string)).toEqual({ idGlobal: UUID });
    });

    it('otro usuario no puede borrar una categoría personal ajena', async () => {
        bd.sobre(/^SELECT id_proyecto, usuario_id FROM categorias/, [{ id_proyecto: null, usuario_id: 8 }]);
        await expect(new EliminarCategoria(bd).ejecutar({ usuarioId: 5, id: 9 }))
            .rejects.toThrow('No tenés permiso sobre este elemento personal');
        expect(bd.que(/^DELETE FROM categorias/)).toHaveLength(0);
    });
});
