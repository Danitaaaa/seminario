import { beforeEach, describe, expect, it } from 'vitest';
import { BDFalsa, crearSyncFalso, type SyncFalso } from './fakes';
import { CambiarRolMiembro } from '../../logicaPersistente/gestionDeProyectos/cambiarRolMiembro';

const miembro = (mail: string, rol: 'propietario' | 'editor' | 'lector' = 'editor', o: object = {}) =>
    ({ mail, rol, activo: true, pendiente: false, fechaUnion: null, fechaBaja: null, ...o });

let bd: BDFalsa;
let sync: SyncFalso;

const ejecutar = (idSolicitante: number, mailMiembro: string, rol: 'editor' | 'lector') =>
    new CambiarRolMiembro(bd, sync as any).ejecutar({ idProyecto: 1, idUsuarioSolicitante: idSolicitante, mailMiembro, rol });

beforeEach(() => {
    bd = new BDFalsa().publicar(1, 'R1')
        .fijarRol(1, 10, 'propietario').fijarRol(1, 11, 'editor').fijarRol(1, 12, 'lector');
    sync = crearSyncFalso();
    sync.listarMiembrosRemotos.mockResolvedValue([
        miembro('prop@x.com', 'propietario'), miembro('ana@x.com', 'editor'), miembro('leo@x.com', 'lector'),
    ]);
});

describe('cambiar rol (casos 8, 26-31)', () => {
    it('editor -> lector: actualiza el servidor y el espejo local', async () => {
        const r = await ejecutar(10, 'ana@x.com', 'lector');
        expect(r).toEqual({ mail: 'ana@x.com', rol: 'lector' });
        expect(sync.gestionarMiembroPorMail).toHaveBeenCalledWith('R1', 'ana@x.com', 'alta', 'lector');
        expect(bd.que(/^UPDATE proyecto_miembros pm SET rol = \$3/)[0].valores).toEqual([1, 'ana@x.com', 'lector']);
    });
    it('lector -> editor', async () => {
        await ejecutar(10, 'leo@x.com', 'editor');
        expect(sync.gestionarMiembroPorMail).toHaveBeenCalledWith('R1', 'leo@x.com', 'alta', 'editor');
    });
    it('un editor también puede cambiar roles (decisión del equipo)', async () => {
        await expect(ejecutar(11, 'leo@x.com', 'editor')).resolves.toMatchObject({ rol: 'editor' });
    });
    it('un lector no puede cambiar roles (caso 29)', async () => {
        await expect(ejecutar(12, 'ana@x.com', 'lector')).rejects.toThrow('No tenés permisos');
        expect(sync.gestionarMiembroPorMail).not.toHaveBeenCalled();
    });
    it('no se puede cambiar el rol del propietario (caso 30)', async () => {
        await expect(ejecutar(10, 'prop@x.com', 'lector')).rejects.toThrow('rol del propietario');
        expect(sync.gestionarMiembroPorMail).not.toHaveBeenCalled();
    });
    it('no reactiva a un miembro dado de baja', async () => {
        sync.listarMiembrosRemotos.mockResolvedValue([miembro('ana@x.com', 'editor', { activo: false })]);
        await expect(ejecutar(10, 'ana@x.com', 'lector')).rejects.toThrow('no es miembro activo');
        expect(sync.gestionarMiembroPorMail).not.toHaveBeenCalled();
    });
    it('sin conexión no se modifica nada (caso 31)', async () => {
        sync.__setConectado(false);
        sync.conectar.mockRejectedValue(new Error('sin red'));
        await expect(ejecutar(10, 'ana@x.com', 'lector')).rejects.toThrow('sin red');
        expect(sync.gestionarMiembroPorMail).not.toHaveBeenCalled();
        expect(bd.que(/^UPDATE proyecto_miembros/)).toHaveLength(0);
    });
    it('si el servidor falla no cambia el espejo local', async () => {
        sync.gestionarMiembroPorMail.mockRejectedValue(new Error('boom'));
        await expect(ejecutar(10, 'ana@x.com', 'lector')).rejects.toThrow('boom');
        expect(bd.que(/^UPDATE proyecto_miembros/)).toHaveLength(0);
    });
    it('el espejo local solo toca miembros activos', async () => {
        await ejecutar(10, 'ana@x.com', 'lector');
        expect(bd.que(/^UPDATE proyecto_miembros/)[0].sql).toContain('fecha_baja IS NULL');
    });
    it('rechaza un mail inválido (zod)', async () => {
        await expect(ejecutar(10, 'no-es-mail', 'lector')).rejects.toThrow();
    });
    it.todo('el miembro afectado ve el nuevo rol en su PC sin reiniciar (caso 26): necesita reconciliar el rol en SincronizarProyecto');
});