import { CrearMeta } from '../../logicaPersistente/gestionDeMetas/crearMeta';
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

describe('CrearMeta', () => {
    beforeEach(() => jest.clearAllMocks());

    // Entrada específica y correcta para CrearMeta
    const entrada = { idUsuario: 7, titulo: 'Correr 10k', mes: '2026-10' };

    it('crea una meta personal y la devuelve materializada', async () => {
        const { persistencia } = crearPersistenciaFalsa([], [[filaMeta({ titulo: 'Correr 10k' })]]);
        const meta = await new CrearMeta(persistencia).ejecutar(entrada);
        expect(meta).toMatchObject({ idMeta: 1, idProyecto: null, titulo: 'Correr 10k', mes: '2026-10', completada: false });
    });

    it('exige rol propietario o editor sobre el proyecto (null si es personal)', async () => {
        const { persistencia } = crearPersistenciaFalsa([], [[filaMeta()]]);
        await new CrearMeta(persistencia).ejecutar(entrada);
        expect(acceso).toHaveBeenCalledWith(persistencia, null, 7, 7, ['propietario', 'editor']);
    });

    it('para una meta de proyecto pasa el idProyecto al control de acceso', async () => {
        const { persistencia } = crearPersistenciaFalsa([], [[filaMeta({ id_proyecto: 5 })]]);
        await new CrearMeta(persistencia).ejecutar({ ...entrada, idProyecto: 5 });
        expect(acceso).toHaveBeenCalledWith(persistencia, 5, 7, 7, ['propietario', 'editor']);
    });

    it('inserta con los parámetros correctos', async () => {
        const { persistencia, txEjecutar } = crearPersistenciaFalsa([], [[filaMeta()]]);
        await new CrearMeta(persistencia).ejecutar({ ...entrada, idProyecto: 5, descripcion: 'Desc' });
        const [sql, valores] = txEjecutar.mock.calls[0];
        expect(sql).toContain('INSERT INTO metas');
        expect(sql).toContain('RETURNING');
        expect(valores).toEqual([5, 'Correr 10k', 'Desc', '2026-10-01', 7]);
    });

    it('guarda idProyecto null y descripción null cuando se omiten', async () => {
        const { persistencia, txEjecutar } = crearPersistenciaFalsa([], [[filaMeta()]]);
        await new CrearMeta(persistencia).ejecutar(entrada);
        expect(txEjecutar.mock.calls[0][1]).toEqual([null, 'Correr 10k', null, '2026-10-01', 7]);
    });

    it('trata idProyecto null explícito igual que omitido', async () => {
        const { persistencia, txEjecutar } = crearPersistenciaFalsa([], [[filaMeta()]]);
        await new CrearMeta(persistencia).ejecutar({ ...entrada, idProyecto: null });
        expect(txEjecutar.mock.calls[0][1][0]).toBeNull();
    });

    it('calcula el orden como MAX+1 dentro del mismo alcance y mes', async () => {
        const { persistencia, txEjecutar } = crearPersistenciaFalsa([], [[filaMeta()]]);
        await new CrearMeta(persistencia).ejecutar(entrada);
        const sql: string = txEjecutar.mock.calls[0][0];
        expect(sql).toContain('COALESCE(MAX(m.orden), 0) + 1');
        expect(sql).toContain('m.id_proyecto IS NOT DISTINCT FROM $1::int');
        expect(sql).toContain('m.mes = $4::date');
        expect(sql).toContain('($1::int IS NOT NULL OR m.creada_por = $5::int)');
    });

    it('aplica trim al título antes de insertar', async () => {
        const { persistencia, txEjecutar } = crearPersistenciaFalsa([], [[filaMeta()]]);
        await new CrearMeta(persistencia).ejecutar({ ...entrada, titulo: '   Correr   ' });
        expect(txEjecutar.mock.calls[0][1][1]).toBe('Correr');
    });

    it('registra el cambio "crear" dentro de la transacción', async () => {
        const { persistencia, tx } = crearPersistenciaFalsa([], [[filaMeta({ id_meta: 11, id_proyecto: 5, titulo: 'X', mes_texto: '2026-10' })]]);
        await new CrearMeta(persistencia).ejecutar({ ...entrada, idProyecto: 5 });
        expect(registrar).toHaveBeenCalledWith(tx, 5, 'meta', 11, 'crear', { titulo: 'X', mes: '2026-10' });
    });

    it('registra el cambio con idProyecto null en metas personales (la función decide ignorarlo)', async () => {
        const { persistencia, tx } = crearPersistenciaFalsa([], [[filaMeta({ id_meta: 3 })]]);
        await new CrearMeta(persistencia).ejecutar(entrada);
        expect(registrar).toHaveBeenCalledWith(tx, null, 'meta', 3, 'crear', expect.any(Object));
    });

    it('no toca la BD si el DTO es inválido', async () => {
        const { persistencia, transaccion } = crearPersistenciaFalsa();
        const caso = new CrearMeta(persistencia);
        await expect(caso.ejecutar({ ...entrada, titulo: '' })).rejects.toThrow();
        await expect(caso.ejecutar({ ...entrada, mes: '2026-13' })).rejects.toThrow();
        expect(acceso).not.toHaveBeenCalled();
        expect(transaccion).not.toHaveBeenCalled();
    });

    it('no abre transacción si no hay permisos', async () => {
        acceso.mockRejectedValueOnce(new Error('Sin permisos'));
        const { persistencia, transaccion } = crearPersistenciaFalsa();
        await expect(new CrearMeta(persistencia).ejecutar(entrada)).rejects.toThrow('Sin permisos');
        expect(transaccion).not.toHaveBeenCalled();
        expect(registrar).not.toHaveBeenCalled();
    });

    it('propaga el error si falla el registro del cambio (rollback de la transacción)', async () => {
        registrar.mockRejectedValueOnce(new Error('Fallo sync'));
        const { persistencia } = crearPersistenciaFalsa([], [[filaMeta()]]);
        await expect(new CrearMeta(persistencia).ejecutar(entrada)).rejects.toThrow('Fallo sync');
    });

    it('propaga el error si falla el INSERT', async () => {
        const { persistencia, txEjecutar } = crearPersistenciaFalsa();
        txEjecutar.mockRejectedValueOnce(new Error('Violación de constraint'));
        await expect(new CrearMeta(persistencia).ejecutar(entrada)).rejects.toThrow('Violación de constraint');
        expect(registrar).not.toHaveBeenCalled();
    });
});