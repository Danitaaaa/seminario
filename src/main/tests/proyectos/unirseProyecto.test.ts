import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BDFalsa, crearSyncFalso, type SyncFalso } from './fakes';
import { UnirseAProyecto } from '../../logicaPersistente/gestionDeProyectos/unirseProyecto';
import { ErrorSincronizacion } from '../../logicaPersistente/gestionDeProyectos/erroresSincronizacion';

const ENLACE = 'proyecto-sync://unirse/tok';
const fila = (o: object = {}) => ({
    id_proyecto: 5, nombre: 'Proy', fecha_creacion: new Date('2030-01-01'), fecha_fin: null, enlace: ENLACE,
    id_nodo_raiz: 88, id_remoto: 'R1', version: 0, version_servidor: 0, ultima_sincronizacion: null, ...o,
});

let bd: BDFalsa;
let sync: SyncFalso;
let crearNodo: { ejecutar: ReturnType<typeof vi.fn> };
let sincronizar: { ejecutar: ReturnType<typeof vi.fn> };

const ejecutar = (enlace = ENLACE) =>
    new UnirseAProyecto(bd, sync as any, crearNodo as any, sincronizar as any, 2).ejecutar({ idUsuario: 10, enlace });

beforeEach(() => {
    bd = new BDFalsa().sobre(/^INSERT INTO proyectos/, [fila()]);
    sync = crearSyncFalso();
    sync.resolverEnlace.mockResolvedValue({ idRemoto: 'R1', nombre: 'Proy', numeroProyecto: '1', rol: 'editor' });
    crearNodo = { ejecutar: vi.fn(async () => ({ id: 88 })) };
    sincronizar = { ejecutar: vi.fn(async () => ({})) };
});

describe('unirse a un proyecto', () => {
    it('crea la carpeta, el proyecto y la membresía con el rol de la invitación (casos 5, 39)', async () => {
        const p = await ejecutar();
        expect(crearNodo.ejecutar).toHaveBeenCalledWith({ nombre: 'Proy', idPadre: 2 });
        expect(bd.que(/^INSERT INTO proyectos/)[0].valores).toEqual(['Proy', 88, 'R1', ENLACE]);
        expect(bd.que(/INSERT INTO proyecto_miembros/)[0].valores).toEqual([5, 10, 'editor']);
        expect(p.idRemoto).toBe('R1');
    });
    it.each(['lector', 'editor'] as const)('respeta el rol %s con el que fue invitado', async (rol) => {
        sync.resolverEnlace.mockResolvedValue({ idRemoto: 'R1', nombre: 'Proy', numeroProyecto: '1', rol });
        await ejecutar();
        expect(bd.que(/INSERT INTO proyecto_miembros/)[0].valores[2]).toBe(rol);
    });
    it('sin invitación previa: NO_INVITADO y no se crea nada (caso 35)', async () => {
        sync.resolverEnlace.mockResolvedValue({ idRemoto: 'R1', nombre: 'Proy', numeroProyecto: '1' });
        await expect(ejecutar()).rejects.toMatchObject({ codigo: 'NO_INVITADO' });
        expect(crearNodo.ejecutar).not.toHaveBeenCalled();
        expect(bd.que(/INSERT INTO proyectos/)).toHaveLength(0);
    });
    it('enlace vacío o con formato incorrecto (caso 36)', async () => {
        await expect(ejecutar('')).rejects.toThrow();
        await expect(ejecutar('esto no es un enlace')).rejects.toThrow();
        expect(sync.resolverEnlace).not.toHaveBeenCalled();
        expect(crearNodo.ejecutar).not.toHaveBeenCalled();
    });
    it('enlace que el servidor no reconoce: no crea proyecto', async () => {
        sync.resolverEnlace.mockRejectedValue(new ErrorSincronizacion('INVITACION_INVALIDA', 'inválido'));
        await expect(ejecutar()).rejects.toMatchObject({ codigo: 'INVITACION_INVALIDA' });
        expect(crearNodo.ejecutar).not.toHaveBeenCalled();
    });
    it('ya unido en esta PC: devuelve el existente sin duplicar (caso 37)', async () => {
        bd.sobre(/^SELECT \* FROM proyectos WHERE id_remoto/, [fila({ id_proyecto: 9 })]);
        const p = await ejecutar();
        expect(p.idProyecto).toBe(9);
        expect(crearNodo.ejecutar).not.toHaveBeenCalled();
        expect(bd.que(/^INSERT INTO/)).toHaveLength(0);
        expect(sincronizar.ejecutar).not.toHaveBeenCalled();
    });
    it('sin conexión: no se crea el proyecto (caso 38)', async () => {
        sync.__setConectado(false);
        sync.conectar.mockRejectedValue(new Error('sin red'));
        await expect(ejecutar()).rejects.toThrow('sin red');
        expect(crearNodo.ejecutar).not.toHaveBeenCalled();
    });
    it('unirse no se encola para compartir', async () => {
        await ejecutar();
        expect(bd.que(/INSERT INTO cola_sincronizacion/)).toHaveLength(0);
    });
    it('dispara la carga inicial desde el proyecto recién creado (caso 40)', async () => {
        await ejecutar();
        expect(sincronizar.ejecutar).toHaveBeenCalledWith({ idProyecto: 5, idUsuario: 10 });
    });
    it('si la carga inicial se corta, el proyecto igual queda creado (caso 41)', async () => {
        sincronizar.ejecutar.mockRejectedValue(new Error('sin red'));
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        await expect(ejecutar()).resolves.toMatchObject({ idProyecto: 5 });
        warn.mockRestore();
    });
    it.todo('si falla la transacción, el nodo raíz queda huérfano (se crea fuera de la transacción)');
});