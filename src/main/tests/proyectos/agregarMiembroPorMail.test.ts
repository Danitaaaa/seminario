import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BDFalsa, crearSyncFalso, type SyncFalso } from './fakes';

vi.mock('../../servicios/correo', () => ({ enviarInvitacionProyecto: vi.fn(async () => undefined) }));
import { enviarInvitacionProyecto } from '../../servicios/correo';
import { AgregarMiembroPorMail } from '../../logicaPersistente/gestionDeProyectos/agregarMiembroPorMail';

const miembro = (mail: string, rol: 'propietario' | 'editor' | 'lector' = 'editor', o: object = {}) =>
    ({ mail, rol, activo: true, pendiente: false, fechaUnion: null, fechaBaja: null, ...o });

let bd: BDFalsa;
let sync: SyncFalso;
const correo = vi.mocked(enviarInvitacionProyecto);

const ejecutar = (mail: string, idSolicitante = 10, rol: 'editor' | 'lector' = 'editor') =>
    new AgregarMiembroPorMail(bd, sync as any).ejecutar({ idProyecto: 1, idUsuarioSolicitante: idSolicitante, mail, rol });

beforeEach(() => {
    correo.mockReset();
    correo.mockResolvedValue(undefined);
    bd = new BDFalsa().publicar(1, 'R1')
        .fijarRol(1, 10, 'propietario').fijarRol(1, 11, 'editor').fijarRol(1, 12, 'lector');
    bd.sobre(/SELECT p\.nombre AS proyecto/, [
        { proyecto: 'Proy', id_remoto: 'R1', enlace: 'proyecto-sync://unirse/tok', invitador: 'Ana' },
    ]);
    sync = crearSyncFalso();
    sync.listarMiembrosRemotos.mockResolvedValue([miembro('prop@x.com', 'propietario')]);
});

describe('invitar por mail', () => {
    it('da de alta en el servidor, manda el mail con el enlace y queda pendiente', async () => {
        const r = await ejecutar('  Nuevo@X.com ');
        expect(r).toEqual({ pendiente: true, mail: 'nuevo@x.com' });
        expect(sync.gestionarMiembroPorMail).toHaveBeenCalledWith('R1', 'nuevo@x.com', 'alta', 'editor');
        expect(correo).toHaveBeenCalledWith('nuevo@x.com', 'Proy', 'Ana', 'proyecto-sync://unirse/tok');
    });
    it('respeta el rol elegido', async () => {
        await ejecutar('n@x.com', 10, 'lector');
        expect(sync.gestionarMiembroPorMail).toHaveBeenCalledWith('R1', 'n@x.com', 'alta', 'lector');
    });
    it('mail con formato inválido: no envía nada (caso 14)', async () => {
        await expect(ejecutar('sin-arroba')).rejects.toThrow();
        expect(sync.gestionarMiembroPorMail).not.toHaveBeenCalled();
        expect(correo).not.toHaveBeenCalled();
    });
    it('usuario ya miembro activo: no envía otro mail (caso 15)', async () => {
        sync.listarMiembrosRemotos.mockResolvedValue([miembro('ya@x.com', 'editor')]);
        await expect(ejecutar('ya@x.com')).rejects.toThrow('ya es miembro');
        expect(sync.gestionarMiembroPorMail).not.toHaveBeenCalled();
        expect(correo).not.toHaveBeenCalled();
    });
    it('sin conexión: no agrega a nadie (caso 16)', async () => {
        sync.__setConectado(false);
        sync.conectar.mockRejectedValue(new Error('sin red'));
        await expect(ejecutar('n@x.com')).rejects.toThrow('sin red');
        expect(sync.gestionarMiembroPorMail).not.toHaveBeenCalled();
        expect(correo).not.toHaveBeenCalled();
    });
    it('proyecto sin publicar (caso 17)', async () => {
        bd.sobre(/SELECT p\.nombre AS proyecto/, [{ proyecto: 'Proy', id_remoto: null, enlace: null, invitador: 'Ana' }]);
        // la primera regla registrada gana: se arma una BD nueva con la respuesta de "sin publicar"
        const sinPublicar = new BDFalsa().fijarRol(1, 10, 'propietario')
            .sobre(/SELECT p\.nombre AS proyecto/, [{ proyecto: 'Proy', id_remoto: null, enlace: null, invitador: 'Ana' }]);
        await expect(new AgregarMiembroPorMail(sinPublicar, sync as any)
            .ejecutar({ idProyecto: 1, idUsuarioSolicitante: 10, mail: 'n@x.com', rol: 'editor' }))
            .rejects.toThrow('todavía no se publicó');
        expect(correo).not.toHaveBeenCalled();
    });
    it('si el mail no sale, deshace el alta (caso 18)', async () => {
        correo.mockRejectedValue(new Error('SMTP caído'));
        await expect(ejecutar('n@x.com')).rejects.toThrow('No se pudo enviar el mail');
        expect(sync.gestionarMiembroPorMail).toHaveBeenLastCalledWith('R1', 'n@x.com', 'baja');
    });
    it('si el mail no sale pero ya estaba pendiente, NO lo da de baja', async () => {
        sync.listarMiembrosRemotos.mockResolvedValue([miembro('n@x.com', 'editor', { pendiente: true })]);
        correo.mockRejectedValue(new Error('SMTP caído'));
        await expect(ejecutar('n@x.com')).rejects.toThrow('No se pudo enviar el mail');
        expect(sync.gestionarMiembroPorMail).not.toHaveBeenCalledWith('R1', 'n@x.com', 'baja');
    });
    it('un pendiente permite reenviar el enlace', async () => {
        sync.listarMiembrosRemotos.mockResolvedValue([miembro('n@x.com', 'editor', { pendiente: true })]);
        await expect(ejecutar('n@x.com')).resolves.toMatchObject({ pendiente: true });
        expect(correo).toHaveBeenCalledTimes(1);
    });
    it('un editor puede invitar (caso 19, decisión del equipo)', async () => {
        await expect(ejecutar('n@x.com', 11)).resolves.toMatchObject({ pendiente: true });
    });
    it('un lector no puede invitar (caso 20)', async () => {
        await expect(ejecutar('n@x.com', 12)).rejects.toThrow('No tenés permisos');
        expect(sync.gestionarMiembroPorMail).not.toHaveBeenCalled();
    });
    it('reinvitar a un miembro dado de baja vuelve a dejarlo pendiente (caso 34)', async () => {
        sync.listarMiembrosRemotos.mockResolvedValue([miembro('n@x.com', 'editor', { activo: false })]);
        await ejecutar('n@x.com');
        expect(sync.gestionarMiembroPorMail).toHaveBeenCalledWith('R1', 'n@x.com', 'alta', 'editor');
        expect(correo).toHaveBeenCalledTimes(1);
    });
    it('no guarda nada local (la lista sale del servidor)', async () => {
        await ejecutar('n@x.com');
        expect(bd.que(/INSERT INTO proyecto_miembros|INSERT INTO proyecto_invitaciones|INSERT INTO cola_sincronizacion/)).toHaveLength(0);
    });
});