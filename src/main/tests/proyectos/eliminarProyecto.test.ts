import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs/promises', () => ({ unlink: vi.fn(async () => undefined) }));
import { unlink } from 'node:fs/promises';
import { BDFalsa, crearSyncFalso, type SyncFalso } from './fakes';
import { EliminarProyecto } from '../../logicaPersistente/gestionDeProyectos/eliminarProyecto';

let bd: BDFalsa;
let sync: SyncFalso;
let dejarDeVigilar: ReturnType<typeof vi.fn>;

const ejecutar = (idUsuario = 10) =>
    new EliminarProyecto(bd, sync as any, dejarDeVigilar as any).ejecutar({ idProyecto: 1, idUsuario });
const idx = (re: RegExp) => bd.consultas.findIndex(c => re.test(c.sql));

beforeEach(() => {
    vi.mocked(unlink).mockClear();
    bd = new BDFalsa().publicar(1, 'R1')
        .fijarRol(1, 10, 'propietario').fijarRol(1, 11, 'editor').fijarRol(1, 12, 'lector');
    bd.sobre(/^SELECT id_nodo_raiz FROM proyectos/, [{ id_nodo_raiz: 77 }]);
    bd.sobre(/DELETE FROM archivos/, [{ ruta_fisica: 'a.pdf' }, { ruta_fisica: 'b.png' }]);
    sync = crearSyncFalso();
    dejarDeVigilar = vi.fn(async () => undefined);
});

describe('eliminar proyecto (casos 6, 121, 122)', () => {
    it('solo el propietario puede', async () => {
        await expect(ejecutar(11)).rejects.toThrow('No tenés permisos');
        await expect(ejecutar(12)).rejects.toThrow('No tenés permisos');
        expect(sync.enviarCambios).not.toHaveBeenCalled();
        expect(bd.que(/^DELETE FROM proyectos/)).toHaveLength(0);
    });
    it('deja de vigilar, avisa al servidor y recién después borra lo local', async () => {
        const orden: string[] = [];
        dejarDeVigilar.mockImplementation(async () => { orden.push('vigilar'); });
        sync.enviarCambios.mockImplementation(async () => { orden.push('servidor'); return 1; });
        await ejecutar();
        expect(orden).toEqual(['vigilar', 'servidor']);
        const [idRemoto, cambios] = sync.enviarCambios.mock.calls[0];
        expect(idRemoto).toBe('R1');
        expect(cambios).toHaveLength(1);
        expect(cambios[0]).toMatchObject({ entidad: 'proyecto', operacion: 'eliminar' });
        expect(idx(/^DELETE FROM proyectos/)).toBeGreaterThan(-1);
    });
    it('si el servidor falla NO se borra nada local', async () => {
        sync.enviarCambios.mockRejectedValue(new Error('sin red'));
        await expect(ejecutar()).rejects.toThrow('no se eliminó');
        expect(bd.que(/^DELETE FROM/)).toHaveLength(0);
        expect(unlink).not.toHaveBeenCalled();
    });
    it('sin conexión tampoco borra nada local', async () => {
        sync.__setConectado(false);
        sync.conectar.mockRejectedValue(new Error('sin red'));
        await expect(ejecutar()).rejects.toThrow('no se eliminó');
        expect(bd.que(/^DELETE FROM/)).toHaveLength(0);
    });
    it('proyecto sin publicar: se borra solo localmente, sin llamar al servidor', async () => {
        bd.publicar(1, null);
        await ejecutar();
        expect(sync.enviarCambios).not.toHaveBeenCalled();
        expect(bd.que(/^DELETE FROM proyectos/)).toHaveLength(1);
    });
    it('borra primero el proyecto y luego archivos y carpetas del subárbol (RESTRICT)', async () => {
        await ejecutar();
        const iProy = idx(/^DELETE FROM proyectos/);
        const iArch = idx(/DELETE FROM archivos/);
        const iNodos = idx(/DELETE FROM nodos/);
        expect(iProy).toBeLessThan(iArch);
        expect(iArch).toBeLessThan(iNodos);
        expect(bd.consultas[iArch].valores).toEqual([77]);
    });
    it('el fallo al dejar de vigilar no impide eliminar', async () => {
        dejarDeVigilar.mockRejectedValue(new Error('x'));
        await expect(ejecutar()).resolves.toBeUndefined();
    });
    it('proyecto inexistente', async () => {
        bd.sobre(/^SELECT id_remoto FROM proyectos/, []);
        await expect(ejecutar()).rejects.toThrow('Proyecto inexistente');
    });
    it('después del commit intenta borrar los archivos físicos (caso 122)', async () => {
        await ejecutar();
        expect(unlink).toHaveBeenCalledTimes(2);
    });
    // BUG conocido: ruta_fisica es relativa a Almacenamiento; unlink(ruta relativa) apunta a otro lugar.
    it.fails('borra los archivos a través de Almacenamiento y no con unlink directo', async () => {
        await ejecutar();
        expect(unlink).not.toHaveBeenCalled();
    });
    it.todo('conservar o no una copia local cuando otro miembro elimina el proyecto (casos 121, 122): no existe en el código aún');
});