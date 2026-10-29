import { CopiarMetas } from '../../logicaPersistente/gestionDeMetas/copiarMetas';
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

describe('CopiarMetas', () => {
    beforeEach(() => jest.clearAllMocks());

    const entrada = { 
        idUsuario: 7, 
        mesOrigen: '2026-09', 
        mesDestino: '2026-10', 
        soloPendientes: true
    };

    it('rechaza copiar al mismo mes antes de verificar permisos', async () => {
        const { persistencia, transaccion } = crearPersistenciaFalsa();
        await expect(new CopiarMetas(persistencia).ejecutar({ ...entrada, mesDestino: '2026-09' }))
            .rejects.toThrow('El mes de origen y el de destino son el mismo');
        expect(acceso).not.toHaveBeenCalled();
        expect(transaccion).not.toHaveBeenCalled();
    });

    it('rechaza meses con formato inválido', async () => {
        const { persistencia } = crearPersistenciaFalsa();
        await expect(new CopiarMetas(persistencia).ejecutar({ ...entrada, mesOrigen: '2026-9' })).rejects.toThrow();
        await expect(new CopiarMetas(persistencia).ejecutar({ ...entrada, mesDestino: 'x' })).rejects.toThrow();
    });

    it('exige propietario o editor', async () => {
        const { persistencia } = crearPersistenciaFalsa([], [[]]);
        await new CopiarMetas(persistencia).ejecutar({ ...entrada, idProyecto: 3 });
        expect(acceso).toHaveBeenCalledWith(persistencia, 3, 7, 7, ['propietario', 'editor']);
    });

    it('en metas personales pasa idProyecto null', async () => {
        const { persistencia } = crearPersistenciaFalsa([], [[]]);
        await new CopiarMetas(persistencia).ejecutar(entrada);
        expect(acceso).toHaveBeenCalledWith(persistencia, null, 7, 7, ['propietario', 'editor']);
    });

    it('no abre transacción si no hay permisos', async () => {
        acceso.mockRejectedValueOnce(new Error('Sin permisos'));
        const { persistencia, transaccion } = crearPersistenciaFalsa();
        await expect(new CopiarMetas(persistencia).ejecutar(entrada)).rejects.toThrow('Sin permisos');
        expect(transaccion).not.toHaveBeenCalled();
    });

    it('copia solo pendientes cuando soloPendientes = true', async () => {
        const { persistencia, txEjecutar } = crearPersistenciaFalsa([], [[]]);
        await new CopiarMetas(persistencia).ejecutar({ ...entrada, idProyecto: 3 });
        expect(txEjecutar.mock.calls[0][1]).toEqual([3, '2026-09-01', '2026-10-01', true, 7]);
    });

    it('si se omite soloPendientes, el DTO aplica el valor por defecto true', async () => {
        const { persistencia, txEjecutar } = crearPersistenciaFalsa([], [[]]);
        const { soloPendientes, ...sinFlag } = entrada;
        await new CopiarMetas(persistencia).ejecutar(sinFlag as any);
        expect(txEjecutar.mock.calls[0][1][3]).toBe(true);
    });

    it('con soloPendientes=false copia también las completadas', async () => {
        const { persistencia, txEjecutar } = crearPersistenciaFalsa([], [[]]);
        await new CopiarMetas(persistencia).ejecutar({ ...entrada, soloPendientes: false });
        expect(txEjecutar.mock.calls[0][1]).toEqual([null, '2026-09-01', '2026-10-01', false, 7]);
    });

    it('el SQL filtra origen/destino, evita duplicados por origen y por título, y numera el orden', async () => {
        const { persistencia, txEjecutar } = crearPersistenciaFalsa([], [[]]);
        await new CopiarMetas(persistencia).ejecutar(entrada);
        const sql: string = txEjecutar.mock.calls[0][0];
        expect(sql).toContain('INSERT INTO metas');
        expect(sql).toContain('id_meta_origen');
        expect(sql).toContain('o.mes = $2::date');
        expect(sql).toContain('$4::boolean = FALSE OR o.completada = FALSE');
        expect(sql).toContain('NOT EXISTS (SELECT 1 FROM metas d WHERE d.id_meta_origen = o.id_meta)');
        expect(sql).toContain('d.titulo = o.titulo');
        expect(sql).toContain('ROW_NUMBER() OVER (ORDER BY o.orden, o.id_meta)');
        expect(sql).toContain('COALESCE(MAX(d.orden), 0)');
        expect(sql).toContain('RETURNING');
    });

    it('en metas personales restringe por creador en origen y destino', async () => {
        const { persistencia, txEjecutar } = crearPersistenciaFalsa([], [[]]);
        await new CopiarMetas(persistencia).ejecutar(entrada);
        const sql: string = txEjecutar.mock.calls[0][0];
        expect(sql).toContain('o.creada_por = $5::int');
        expect(sql).toContain('d.creada_por = $5::int');
    });

    it('devuelve las metas copiadas materializadas', async () => {
        const filas = [
            filaMeta({ id_meta: 20, titulo: 'A', mes_texto: '2026-10', id_meta_origen: 10, orden: 1 }),
            filaMeta({ id_meta: 21, titulo: 'B', mes_texto: '2026-10', id_meta_origen: 11, orden: 2 }),
        ];
        const { persistencia } = crearPersistenciaFalsa([], [filas]);
        const copiadas = await new CopiarMetas(persistencia).ejecutar(entrada);
        expect(copiadas).toHaveLength(2);
        expect(copiadas.map(m => m.idMetaOrigen)).toEqual([10, 11]);
        expect(copiadas.every(m => m.mes === '2026-10')).toBe(true);
    });

    it('registra un cambio "crear" por cada meta copiada', async () => {
        const filas = [
            filaMeta({ id_meta: 20, id_proyecto: 3, titulo: 'A' }),
            filaMeta({ id_meta: 21, id_proyecto: 3, titulo: 'B' }),
        ];
        const { persistencia, tx } = crearPersistenciaFalsa([], [filas]);
        await new CopiarMetas(persistencia).ejecutar({ ...entrada, idProyecto: 3 });
        expect(registrar).toHaveBeenCalledTimes(2);
        expect(registrar).toHaveBeenNthCalledWith(1, tx, 3, 'meta', 20, 'crear', { titulo: 'A', mes: '2026-10' });
        expect(registrar).toHaveBeenNthCalledWith(2, tx, 3, 'meta', 21, 'crear', { titulo: 'B', mes: '2026-10' });
    });

    it('si no hay nada para copiar devuelve [] y no registra cambios', async () => {
        const { persistencia } = crearPersistenciaFalsa([], [[]]);
        await expect(new CopiarMetas(persistencia).ejecutar(entrada)).resolves.toEqual([]);
        expect(registrar).not.toHaveBeenCalled();
    });

    it('propaga errores del registro de cambios', async () => {
        registrar.mockRejectedValueOnce(new Error('Fallo sync'));
        const { persistencia } = crearPersistenciaFalsa([], [[filaMeta()]]);
        await expect(new CopiarMetas(persistencia).ejecutar(entrada)).rejects.toThrow('Fallo sync');
    });
    // Spec caso 114: copiar dos veces seguidas no duplica lo ya copiado.
    it('una segunda copia idéntica no devuelve metas ni registra cambios (nada que duplicar)', async () => {
        const primera = [filaMeta({ id_meta: 20, id_proyecto: 3, titulo: 'A', id_meta_origen: 10 })];
        const { persistencia } = crearPersistenciaFalsa([], [primera, []]);
        const caso = new CopiarMetas(persistencia);
        expect(await caso.ejecutar({ ...entrada, idProyecto: 3 })).toHaveLength(1);
        registrar.mockClear();
        expect(await caso.ejecutar({ ...entrada, idProyecto: 3 })).toEqual([]);
        expect(registrar).not.toHaveBeenCalled();
    });

    it('el lector no puede copiar metas (roles exigidos sin "lector")', async () => {
        const { persistencia } = crearPersistenciaFalsa([], [[]]);
        await new CopiarMetas(persistencia).ejecutar({ ...entrada, idProyecto: 3 });
        expect(acceso.mock.calls[0][4]).not.toContain('lector');
    });
});