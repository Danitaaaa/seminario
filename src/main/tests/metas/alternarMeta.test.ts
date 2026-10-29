import { AlternarMeta } from '../../logicaPersistente/gestionDeMetas/alternarMeta';
import { exigirAcceso, registrarCambioSiProyecto } from '../../logicaPersistente/gestionDeProyectos/alcance';
import { crearPersistenciaFalsa, filaMeta } from './utilsTest';

jest.mock('../../logicaPersistente/gestionDeProyectos/alcance', () => ({
    exigirAcceso: jest.fn(),
    registrarCambioSiProyecto: jest.fn(),
    filtroAlcance: jest.fn((valores: unknown[], idProyecto: number | null, idUsuario: number) => {
        valores.push(idProyecto ?? idUsuario);
        return idProyecto !== null ? `id_proyecto = $${valores.length}` : `creada_por = $${valores.length}`;
    }),
}), { virtual: true });

const acceso = exigirAcceso as jest.Mock;
const registrar = registrarCambioSiProyecto as jest.Mock;

describe('AlternarMeta', () => {
    beforeEach(() => jest.clearAllMocks());

    it('lanza "Meta inexistente" si no existe', async () => {
        const { persistencia } = crearPersistenciaFalsa([[]]);
        await expect(new AlternarMeta(persistencia).ejecutar({ idMeta: 9, idUsuario: 7 })).rejects.toThrow('Meta inexistente');
    });

    it('exige propietario o editor con el proyecto y creador de la meta', async () => {
        const actual = filaMeta({ id_proyecto: 4, creada_por: 12 });
        const { persistencia } = crearPersistenciaFalsa([[actual]], [[actual]]);
        await new AlternarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7 });
        expect(acceso).toHaveBeenCalledWith(persistencia, 4, 12, 7, ['propietario', 'editor']);
    });

    it('no modifica nada si no hay permisos', async () => {
        acceso.mockRejectedValueOnce(new Error('Sin permisos'));
        const { persistencia, transaccion } = crearPersistenciaFalsa([[filaMeta()]]);
        await expect(new AlternarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7 })).rejects.toThrow('Sin permisos');
        expect(transaccion).not.toHaveBeenCalled();
    });

    it('rechaza metas trasladadas a otro mes', async () => {
        const { persistencia, transaccion } = crearPersistenciaFalsa([[filaMeta({ trasladada_a: '2026-11' })]]);
        await expect(new AlternarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7 }))
            .rejects.toThrow('La meta fue trasladada a otro mes');
        expect(transaccion).not.toHaveBeenCalled();
        expect(registrar).not.toHaveBeenCalled();
    });

    it('sin "completada" invierte pendiente → completada', async () => {
        const { persistencia, txEjecutar } = crearPersistenciaFalsa(
            [[filaMeta({ completada: false })]], [[filaMeta({ completada: true })]]);
        const meta = await new AlternarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7 });
        expect(txEjecutar.mock.calls[0][1]).toEqual([true, 7, 1]);
        expect(meta.completada).toBe(true);
    });

    it('sin "completada" invierte completada → pendiente', async () => {
        const { persistencia, txEjecutar } = crearPersistenciaFalsa(
            [[filaMeta({ completada: true })]], [[filaMeta({ completada: false })]]);
        const meta = await new AlternarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7 });
        expect(txEjecutar.mock.calls[0][1]).toEqual([false, 7, 1]);
        expect(meta.completada).toBe(false);
    });

    it('con completada=true explícito marca aunque ya esté completada', async () => {
        const { persistencia, txEjecutar } = crearPersistenciaFalsa(
            [[filaMeta({ completada: true })]], [[filaMeta({ completada: true })]]);
        await new AlternarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7, completada: true });
        expect(txEjecutar.mock.calls[0][1][0]).toBe(true);
    });

    it('con completada=false explícito desmarca (false no se confunde con "no enviado")', async () => {
        const { persistencia, txEjecutar } = crearPersistenciaFalsa(
            [[filaMeta({ completada: false })]], [[filaMeta({ completada: false })]]);
        await new AlternarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7, completada: false });
        expect(txEjecutar.mock.calls[0][1][0]).toBe(false);
    });

    it('el UPDATE setea fecha y usuario al completar y los limpia al desmarcar', async () => {
        const { persistencia, txEjecutar } = crearPersistenciaFalsa([[filaMeta()]], [[filaMeta()]]);
        await new AlternarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7 });
        const sql: string = txEjecutar.mock.calls[0][0];
        expect(sql).toContain('fecha_completada = CASE WHEN $1 THEN NOW() ELSE NULL END');
        expect(sql).toContain('completada_por = CASE WHEN $1 THEN $2::int ELSE NULL END');
        expect(sql).toContain('WHERE id_meta = $3');
    });

    it('guarda como "completada_por" al usuario que solicita (no al creador)', async () => {
        const { persistencia, txEjecutar } = crearPersistenciaFalsa([[filaMeta({ creada_por: 12 })]], [[filaMeta()]]);
        await new AlternarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7 });
        expect(txEjecutar.mock.calls[0][1][1]).toBe(7);
    });

    it('registra el cambio "modificar" con el estado resultante', async () => {
        const { persistencia, tx } = crearPersistenciaFalsa(
            [[filaMeta()]], [[filaMeta({ id_meta: 3, id_proyecto: 2, completada: true })]]);
        await new AlternarMeta(persistencia).ejecutar({ idMeta: 3, idUsuario: 7 });
        expect(registrar).toHaveBeenCalledWith(tx, 2, 'meta', 3, 'modificar', { completada: true });
    });

    it('rechaza un DTO inválido', async () => {
        const { persistencia, ejecutar } = crearPersistenciaFalsa();
        await expect(new AlternarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7, completada: 'si' as any })).rejects.toThrow();
        expect(ejecutar).not.toHaveBeenCalled();
    });
    // Regla de negocio: el lector NO puede marcar una meta como cumplida (a diferencia de las tareas).
    it('el lector no puede marcar ni desmarcar metas (roles exigidos sin "lector")', async () => {
        const { persistencia } = crearPersistenciaFalsa([[filaMeta({ id_proyecto: 4 })]], [[filaMeta()]]);
        await new AlternarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7 });
        const roles: string[] = acceso.mock.calls[0][4];
        expect(roles).toEqual(['propietario', 'editor']);
        expect(roles).not.toContain('lector');
    });

    it('si el acceso se rechaza (lector) no actualiza, no registra y no importa el valor de "completada"', async () => {
        for (const completada of [true, false, undefined]) {
            acceso.mockRejectedValueOnce(new Error('No hay permisos para esa operación'));
            const { persistencia, transaccion, txEjecutar } = crearPersistenciaFalsa([[filaMeta({ id_proyecto: 4 })]]);
            await expect(new AlternarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7, completada }))
                .rejects.toThrow('No hay permisos');
            expect(transaccion).not.toHaveBeenCalled();
            expect(txEjecutar).not.toHaveBeenCalled();
        }
        expect(registrar).not.toHaveBeenCalled();
    });

    it('rechaza una meta trasladada también cuando se pide completada=true explícito', async () => {
        const { persistencia, transaccion } = crearPersistenciaFalsa([[filaMeta({ trasladada_a: '2026-11' })]]);
        await expect(new AlternarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7, completada: true }))
            .rejects.toThrow('La meta fue trasladada a otro mes');
        expect(transaccion).not.toHaveBeenCalled();
    });

    it('en una meta personal ajena el control de acceso recibe al creador real de la meta', async () => {
        const { persistencia } = crearPersistenciaFalsa([[filaMeta({ id_proyecto: null, creada_por: 12 })]], [[filaMeta()]]);
        await new AlternarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7 });
        expect(acceso).toHaveBeenCalledWith(persistencia, null, 12, 7, ['propietario', 'editor']);
    });
});