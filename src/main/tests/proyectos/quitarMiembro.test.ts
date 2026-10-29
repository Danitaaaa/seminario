import { beforeEach, describe, expect, it } from 'vitest';
import { BDFalsa, crearSyncFalso, type SyncFalso } from './fakes';
import { QuitarMiembro } from '../../logicaPersistente/gestionDeProyectos/quitarMiembro';

const miembro = (mail: string, rol: 'propietario' | 'editor' | 'lector' = 'editor', o: object = {}) =>
    ({ mail, rol, activo: true, pendiente: false, fechaUnion: null, fechaBaja: null, ...o });

let bd: BDFalsa;
let sync: SyncFalso;
let emailSolicitante: string;

const ejecutar = (idSolicitante: number, mailMiembro: string) =>
    new QuitarMiembro(bd, sync as any).ejecutar({ idProyecto: 1, idUsuarioSolicitante: idSolicitante, mailMiembro });

beforeEach(() => {
    emailSolicitante = 'prop@x.com';
    bd = new BDFalsa().publicar(1, 'R1')
        .fijarRol(1, 10, 'propietario').fijarRol(1, 11, 'editor').fijarRol(1, 12, 'lector');
    bd.sobre(/SELECT LOWER\(email\) AS email FROM usuarios WHERE id_usuario = \$1/, () => [{ email: emailSolicitante }]);
    sync = crearSyncFalso();
    sync.listarMiembrosRemotos.mockResolvedValue([
        miembro('prop@x.com', 'propietario'), miembro('ana@x.com', 'editor'),
    ]);
});

describe('quitar miembro (casos 4, 21, 22, 31, 32)', () => {
    it('el propietario da de baja en el servidor y refleja la baja local', async () => {
        await ejecutar(10, 'ANA@x.com');
        expect(sync.gestionarMiembroPorMail).toHaveBeenCalledWith('R1', 'ana@x.com', 'baja');
        const upd = bd.que(/^UPDATE proyecto_miembros pm SET fecha_baja = NOW\(\)/)[0];
        expect(upd.valores).toEqual([1, 'ana@x.com']);
    });
    it('un editor también puede quitar (decisión del equipo)', async () => {
        emailSolicitante = 'ed@x.com';
        await expect(ejecutar(11, 'ana@x.com')).resolves.toBeUndefined();
        expect(sync.gestionarMiembroPorMail).toHaveBeenCalledWith('R1', 'ana@x.com', 'baja');
    });
    it('un lector no puede quitar a nadie', async () => {
        emailSolicitante = 'lec@x.com';
        await expect(ejecutar(12, 'ana@x.com')).rejects.toThrow('No tenés permisos');
        expect(sync.gestionarMiembroPorMail).not.toHaveBeenCalled();
    });
    it('no se puede quitar al propietario', async () => {
        await expect(ejecutar(10, 'prop@x.com')).rejects.toThrow('propietario');
        expect(sync.gestionarMiembroPorMail).not.toHaveBeenCalled();
    });
    it('rechaza a quien no es miembro activo del servidor', async () => {
        await expect(ejecutar(10, 'nadie@x.com')).rejects.toThrow('no es miembro activo');
        sync.listarMiembrosRemotos.mockResolvedValue([miembro('ana@x.com', 'editor', { activo: false })]);
        await expect(ejecutar(10, 'ana@x.com')).rejects.toThrow('no es miembro activo');
    });
    it('sin conexión no cambia nada, ni en el servidor ni local', async () => {
        sync.__setConectado(false);
        sync.conectar.mockRejectedValue(new Error('sin red'));
        await expect(ejecutar(10, 'ana@x.com')).rejects.toThrow('sin red');
        expect(sync.gestionarMiembroPorMail).not.toHaveBeenCalled();
        expect(bd.que(/^UPDATE proyecto_miembros/)).toHaveLength(0);
    });
    it('si el servidor rechaza la baja, no se toca la base local', async () => {
        sync.gestionarMiembroPorMail.mockRejectedValue(new Error('SIN_PERMISO'));
        await expect(ejecutar(10, 'ana@x.com')).rejects.toThrow('SIN_PERMISO');
        expect(bd.que(/^UPDATE proyecto_miembros/)).toHaveLength(0);
    });
    it('no registra la baja en la cola (el servidor rechazaría el envío)', async () => {
        await ejecutar(10, 'ana@x.com');
        expect(bd.que(/INSERT INTO cola_sincronizacion/)).toHaveLength(0);
    });
    it('proyecto sin publicar: avisa que hay que esperar', async () => {
        bd.publicar(1, null);
        await expect(ejecutar(10, 'ana@x.com')).rejects.toThrow('todavía no se publicó');
    });
    it('acepta idUsuarioMiembro y resuelve su mail', async () => {
        bd.sobre(/SELECT LOWER\(email\) AS email FROM usuarios WHERE id_usuario = \$1/, (v) =>
            [{ email: v[0] === 99 ? 'ana@x.com' : 'prop@x.com' }]);
        await new QuitarMiembro(bd, sync as any).ejecutar({ idProyecto: 1, idUsuarioSolicitante: 10, idUsuarioMiembro: 99 });
        expect(sync.gestionarMiembroPorMail).toHaveBeenCalledWith('R1', 'ana@x.com', 'baja');
    });
});

describe('abandonar el proyecto (caso 123)', () => {
    it('un lector puede darse de baja a sí mismo', async () => {
        emailSolicitante = 'lec@x.com';
        sync.listarMiembrosRemotos.mockResolvedValue([miembro('lec@x.com', 'lector')]);
        await expect(ejecutar(12, 'lec@x.com')).resolves.toBeUndefined();
        expect(sync.gestionarMiembroPorMail).toHaveBeenCalledWith('R1', 'lec@x.com', 'baja');
    });
    it('el propietario no puede abandonar sin transferir (caso 125)', async () => {
        await expect(ejecutar(10, 'prop@x.com')).rejects.toThrow('propietario');
    });
    // Huecos del código: documentan lo que el documento pide y hoy no existe.
    it.todo('al salir, el proyecto se elimina de la base local de quien sale (caso 123)');
    it.todo('transferir la propiedad antes de salir (casos 124, 125)');
    it.todo('al quitar a un miembro, su PC pierde el acceso en la próxima sincronización (casos 33, 84, bug 10)');
});