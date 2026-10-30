import { beforeEach, describe, expect, it } from 'vitest';
import { BDFalsa } from './fakes';
import { exigirAcceso, filtroAlcance, registrarCambioSiProyecto } from '../../logicaPersistente/gestionDeProyectos/alcance';
import { registrarCambioContenido } from '../../logicaPersistente/gestionDeProyectos/alcanceContenido';

let bd: BDFalsa;
beforeEach(() => { bd = new BDFalsa().fijarRol(1, 10, 'editor'); });
const colaInsertada = () => bd.que(/^INSERT INTO cola_sincronizacion/);

describe('exigirAcceso', () => {
    it('elemento personal: solo su creador', async () => {
        await expect(exigirAcceso(bd, null, 10, 10, 'tarea.crear')).resolves.toBeUndefined();
        await expect(exigirAcceso(bd, undefined, 10, 11, 'tarea.crear')).rejects.toThrow('personal');
    });
    it('elemento de proyecto: delega en exigirPermiso', async () => {
        await expect(exigirAcceso(bd, 1, 99, 10, 'tarea.crear')).resolves.toBeUndefined();
        await expect(exigirAcceso(bd, 1, 99, 10, 'proyecto.eliminar')).rejects.toThrow('No tenés permisos');
        await expect(exigirAcceso(bd, 1, 99, 55, 'tarea.crear')).rejects.toThrow('no es miembro');
    });
});

describe('filtroAlcance', () => {
    it('sin proyecto filtra por elementos personales del usuario', () => {
        const v: unknown[] = [];
        expect(filtroAlcance(v, null, 7)).toBe('id_proyecto IS NULL AND creada_por = $1');
        expect(v).toEqual([7]);
    });
    it('con proyecto filtra por proyecto y respeta la numeración de parámetros', () => {
        const v: unknown[] = ['x'];
        expect(filtroAlcance(v, 3, 7)).toBe('id_proyecto = $2');
        expect(v).toEqual(['x', 3]);
    });
});

describe('registrarCambioSiProyecto', () => {
    it('elemento personal: no encola nada', async () => {
        await registrarCambioSiProyecto(bd, null, 'evento', 5, 'crear', {});
        expect(bd.consultas).toHaveLength(0);
    });
    it('crear/modificar: agrega idGlobal leído de la tabla de la entidad', async () => {
        bd.sobre(/SELECT id_global FROM eventos WHERE id = \$1/, [{ id_global: 'g-1' }]);
        await registrarCambioSiProyecto(bd, 1, 'evento', 5, 'modificar', { titulo: 'T' });
        expect(JSON.parse(colaInsertada()[0].valores[4] as string)).toEqual({ titulo: 'T', idGlobal: 'g-1' });
    });
    it.each([['meta', 'metas', 'id_meta'], ['tarea', 'tareas', 'id_tarea']] as const)(
        'usa la tabla y PK correctas para %s', async (entidad, tabla, pk) => {
            bd.sobre(new RegExp(`SELECT id_global FROM ${tabla} WHERE ${pk} = \\$1`), [{ id_global: 'g' }]);
            await registrarCambioSiProyecto(bd, 1, entidad, 8, 'crear', undefined);
            expect(JSON.parse(colaInsertada()[0].valores[4] as string)).toEqual({ idGlobal: 'g' });
        });
    it('eliminar: no consulta; usa los datos tal cual', async () => {
        await registrarCambioSiProyecto(bd, 1, 'evento', 5, 'eliminar', { idGlobal: 'g-9' });
        expect(bd.que(/SELECT id_global/)).toHaveLength(0);
        expect(JSON.parse(colaInsertada()[0].valores[4] as string)).toEqual({ idGlobal: 'g-9' });
    });
    it('si la fila ya no está, encola con los datos originales', async () => {
        await registrarCambioSiProyecto(bd, 1, 'tarea', 5, 'modificar', { x: 1 });
        expect(JSON.parse(colaInsertada()[0].valores[4] as string)).toEqual({ x: 1 });
    });
});

describe('registrarCambioContenido', () => {
    const arbol = (idProyecto: number | null) =>
        bd.sobre(/WITH RECURSIVE ancestros/, idProyecto ? [{ id_proyecto: idProyecto, id_nodo_raiz: 10 }] : [])
          .sobre(/SELECT id_global FROM nodos WHERE id_nodo = \$1/, [{ id_global: 'g-padre' }]);

    it('no encola si el nodo no cuelga de un proyecto', async () => {
        arbol(null);
        await registrarCambioContenido(bd, 'nodo', 3, 'crear', 'g', 9);
        expect(colaInsertada()).toHaveLength(0);
    });
    it('el padre viaja por id_global', async () => {
        arbol(1);
        await registrarCambioContenido(bd, 'archivo', 3, 'crear', 'g-arch', 9, { nombre: 'a.txt' });
        const [c] = colaInsertada();
        expect(c.valores.slice(0, 4)).toEqual([1, 'archivo', 3, 'crear']);
        expect(JSON.parse(c.valores[4] as string)).toEqual({
            idGlobal: 'g-arch', datos: { nombre: 'a.txt', padre_global: 'g-padre', padre_es_raiz: false },
        });
    });
    it('marca padre_es_raiz cuando cuelga directo de la raíz del proyecto', async () => {
        arbol(1);
        await registrarCambioContenido(bd, 'nodo', 3, 'crear', 'g', 10);
        expect(JSON.parse(colaInsertada()[0].valores[4] as string).datos.padre_es_raiz).toBe(true);
    });
});
