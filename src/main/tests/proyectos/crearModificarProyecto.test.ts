import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BDFalsa } from './fakes';
import { CrearProyecto } from '../../logicaPersistente/gestionDeProyectos/crearProyecto';
import { ModificarProyecto } from '../../logicaPersistente/gestionDeProyectos/modificarProyecto';

const fila = (o: object = {}) => ({
    id_proyecto: 1, nombre: 'P', fecha_creacion: new Date('2030-01-01'), fecha_fin: null, enlace: null,
    id_nodo_raiz: 77, id_remoto: null, version: 0, version_servidor: 0, ultima_sincronizacion: null, ...o,
});

let bd: BDFalsa;

describe('crear proyecto (casos 9, 10)', () => {
    let crearNodo: { ejecutar: ReturnType<typeof vi.fn> };
    beforeEach(() => {
        bd = new BDFalsa().sobre(/^INSERT INTO proyectos/, [fila()]);
        crearNodo = { ejecutar: vi.fn(async () => ({ id: 77 })) };
    });
    const ejecutar = (o: object = {}) =>
        new CrearProyecto(bd, crearNodo as any).ejecutar({ idUsuario: 10, nombre: 'P', ...o } as any);

    it('crea la carpeta raíz colgando de la raíz global y el proyecto con ese nodo', async () => {
        const p = await ejecutar();
        expect(crearNodo.ejecutar).toHaveBeenCalledWith({ nombre: 'P', idPadre: 2 });
        expect(bd.que(/^INSERT INTO proyectos/)[0].valores).toEqual(['P', null, 77]);
        expect(p.idNodoRaiz).toBe(77);
    });
    it('el usuario queda como propietario', async () => {
        await ejecutar();
        const ins = bd.que(/INSERT INTO proyecto_miembros/)[0];
        expect(ins.sql).toContain("'propietario'");
        expect(ins.valores).toEqual([1, 10]);
    });
    it('encola el alta para publicarse cuando haya conexión; queda sin id remoto', async () => {
        const p = await ejecutar();
        expect(bd.que(/INSERT INTO cola_sincronizacion/)[0].valores.slice(0, 4)).toEqual([1, 'proyecto', 1, 'crear']);
        expect(p.idRemoto).toBeNull();
    });
    it('guarda la fecha de fin si se indica', async () => {
        await ejecutar({ fechaFin: '2031-05-01' });
        expect((bd.que(/^INSERT INTO proyectos/)[0].valores[1] as Date).toISOString()).toContain('2031-05-01');
    });
    it('rechaza nombre vacío o demasiado largo sin crear nada', async () => {
        await expect(ejecutar({ nombre: '' })).rejects.toThrow();
        await expect(ejecutar({ nombre: 'x'.repeat(101) })).rejects.toThrow();
        expect(crearNodo.ejecutar).not.toHaveBeenCalled();
    });
    it('todo el alta ocurre en la transacción: proyecto, miembro y cola', async () => {
        await ejecutar();
        expect(bd.consultas).toHaveLength(4); // INSERT proyecto, INSERT miembro, INSERT cola, UPDATE version
    });
    it.todo('si falla la transacción, el nodo raíz creado antes queda huérfano (hoy no se limpia)');
});

describe('modificar proyecto (casos 11, 12)', () => {
    let modificarNodo: { ejecutar: ReturnType<typeof vi.fn> };
    beforeEach(() => {
        bd = new BDFalsa().fijarRol(1, 10, 'propietario').fijarRol(1, 11, 'editor').fijarRol(1, 12, 'lector')
            .sobre(/^UPDATE proyectos SET .* RETURNING/, [fila({ nombre: 'Nuevo' })]);
        modificarNodo = { ejecutar: vi.fn(async () => undefined) };
    });
    const ejecutar = (idUsuario: number, o: object = { nombre: 'Nuevo' }) =>
        new ModificarProyecto(bd, modificarNodo as any).ejecutar({ idProyecto: 1, idUsuario, ...o } as any);

    it.each([[10, 'propietario'], [11, 'editor']])('%s (%s) puede renombrar', async (id) => {
        await expect(ejecutar(id)).resolves.toMatchObject({ nombre: 'Nuevo' });
    });
    it('un lector no puede y no se toca nada (caso 12)', async () => {
        await expect(ejecutar(12)).rejects.toThrow('No tenés permisos');
        expect(bd.que(/^UPDATE proyectos/)).toHaveLength(0);
        expect(modificarNodo.ejecutar).not.toHaveBeenCalled();
    });
    it('el nombre nuevo también se aplica a la carpeta raíz', async () => {
        await ejecutar(10);
        expect(modificarNodo.ejecutar).toHaveBeenCalledWith({ id: 77, nombre: 'Nuevo' });
    });
    it('cambiar solo la fecha de fin no renombra la carpeta', async () => {
        await ejecutar(10, { fechaFin: null });
        expect(modificarNodo.ejecutar).not.toHaveBeenCalled();
        expect(bd.que(/^UPDATE proyectos/)[0].sql).toContain('fecha_fin = $1');
    });
    it('sin campos: error', async () => {
        await expect(ejecutar(10, {})).rejects.toThrow('No hay campos');
    });
    it('encola la modificación para los demás miembros', async () => {
        await ejecutar(10);
        expect(bd.que(/INSERT INTO cola_sincronizacion/)[0].valores.slice(0, 4)).toEqual([1, 'proyecto', 1, 'modificar']);
    });
    it('proyecto inexistente', async () => {
        const vacia = new BDFalsa().fijarRol(1, 10, 'propietario').sobre(/^UPDATE proyectos/, []);
        await expect(new ModificarProyecto(vacia, modificarNodo as any).ejecutar({ idProyecto: 1, idUsuario: 10, nombre: 'X' }))
            .rejects.toThrow('Proyecto inexistente');
    });
    it.todo('los demás miembros ven el nuevo nombre al sincronizar (caso 11): no hay manejador para la entidad "proyecto" en aplicarCambioRemoto');
});