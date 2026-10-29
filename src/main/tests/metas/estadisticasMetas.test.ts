import { EstadisticasMetasProyecto } from '../../logicaPersistente/gestionDeMetas/estadisticasMetas';
import { exigirAcceso, filtroAlcance } from '../../logicaPersistente/gestionDeProyectos/alcance';
import { crearPersistenciaFalsa } from './utilsTest';

jest.mock('../../logicaPersistente/gestionDeProyectos/alcance', () => ({
    exigirAcceso: jest.fn(),
    registrarCambioSiProyecto: jest.fn(),
    filtroAlcance: jest.fn((valores: unknown[], idProyecto: number | null, idUsuario: number) => {
        valores.push(idProyecto ?? idUsuario);
        return idProyecto !== null ? `id_proyecto = $${valores.length}` : `creada_por = $${valores.length}`;
    }),
}), { virtual: true });

const acceso = exigirAcceso as jest.Mock;
const filtro = filtroAlcance as jest.Mock;

describe('EstadisticasMetasProyecto', () => {
    beforeEach(() => jest.clearAllMocks());

    it('exige acceso de lectura (cualquier rol)', async () => {
        const { persistencia } = crearPersistenciaFalsa([[], []]);
        await new EstadisticasMetasProyecto(persistencia).ejecutar({ idUsuario: 7, idProyecto: 3 });
        expect(acceso).toHaveBeenCalledWith(persistencia, 3, 7, 7, ['propietario', 'editor', 'lector']);
    });

    it('no consulta si no hay acceso', async () => {
        acceso.mockRejectedValueOnce(new Error('Sin permisos'));
        const { persistencia, ejecutar } = crearPersistenciaFalsa();
        await expect(new EstadisticasMetasProyecto(persistencia).ejecutar({ idUsuario: 7, idProyecto: 3 }))
            .rejects.toThrow('Sin permisos');
        expect(ejecutar).not.toHaveBeenCalled();
    });

    it('mapea resultados por mes y por miembro', async () => {
        const porMes = [
            { mes: '2026-09', total: 5, completadas: 3, trasladadas: 1 },
            { mes: '2026-10', total: 2, completadas: 2, trasladadas: 0 },
        ];
        const porMiembro = [{ id_usuario: 7, completadas: 4 }, { id_usuario: 8, completadas: 1 }];
        const { persistencia } = crearPersistenciaFalsa([porMes, porMiembro]);
        const r = await new EstadisticasMetasProyecto(persistencia).ejecutar({ idUsuario: 7, idProyecto: 3 });
        expect(r).toEqual({
            porMes: [
                { mes: '2026-09', total: 5, completadas: 3, trasladadas: 1 },
                { mes: '2026-10', total: 2, completadas: 2, trasladadas: 0 },
            ],
            porMiembro: [{ idUsuario: 7, completadas: 4 }, { idUsuario: 8, completadas: 1 }],
        });
    });

    it('sin datos devuelve listas vacías', async () => {
        const { persistencia } = crearPersistenciaFalsa([[], []]);
        await expect(new EstadisticasMetasProyecto(persistencia).ejecutar({ idUsuario: 7 }))
            .resolves.toEqual({ porMes: [], porMiembro: [] });
    });

    it('sin rango solo aplica el filtro de alcance', async () => {
        const { persistencia, ejecutar } = crearPersistenciaFalsa([[], []]);
        await new EstadisticasMetasProyecto(persistencia).ejecutar({ idUsuario: 7, idProyecto: 3 });
        const [sqlMes, valores] = ejecutar.mock.calls[0];
        expect(sqlMes).toContain('WHERE id_proyecto = $1)');
        expect(sqlMes).not.toContain('mes >=');
        expect(sqlMes).not.toContain('mes <=');
        expect(valores).toEqual([3]);
    });

    it('con "desde" agrega mes >= con su placeholder', async () => {
        const { persistencia, ejecutar } = crearPersistenciaFalsa([[], []]);
        await new EstadisticasMetasProyecto(persistencia).ejecutar({ idUsuario: 7, idProyecto: 3, desde: '2026-03' });
        const [sql, valores] = ejecutar.mock.calls[0];
        expect(sql).toContain('mes >= $2::date');
        expect(sql).not.toContain('mes <=');
        expect(valores).toEqual([3, '2026-03-01']);
    });

    it('con "hasta" agrega mes <= con su placeholder', async () => {
        const { persistencia, ejecutar } = crearPersistenciaFalsa([[], []]);
        await new EstadisticasMetasProyecto(persistencia).ejecutar({ idUsuario: 7, idProyecto: 3, hasta: '2026-08' });
        const [sql, valores] = ejecutar.mock.calls[0];
        expect(sql).toContain('mes <= $2::date');
        expect(sql).not.toContain('mes >=');
        expect(valores).toEqual([3, '2026-08-01']);
    });

    it('con ambos extremos numera los placeholders correctamente', async () => {
        const { persistencia, ejecutar } = crearPersistenciaFalsa([[], []]);
        await new EstadisticasMetasProyecto(persistencia).ejecutar({ idUsuario: 7, idProyecto: 3, desde: '2026-01', hasta: '2026-12' });
        const [sql, valores] = ejecutar.mock.calls[0];
        expect(sql).toContain('mes >= $2::date');
        expect(sql).toContain('mes <= $3::date');
        expect(valores).toEqual([3, '2026-01-01', '2026-12-01']);
    });

    it('en metas personales filtra por usuario', async () => {
        const { persistencia, ejecutar } = crearPersistenciaFalsa([[], []]);
        await new EstadisticasMetasProyecto(persistencia).ejecutar({ idUsuario: 7 });
        expect(acceso).toHaveBeenCalledWith(persistencia, null, 7, 7, ['propietario', 'editor', 'lector']);
        expect(filtro).toHaveBeenCalledWith(expect.any(Array), null, 7);
        expect(ejecutar.mock.calls[0][0]).toContain('creada_por = $1');
    });

    it('ejecuta primero la consulta por mes y luego la de miembros, con los mismos valores', async () => {
        const { persistencia, ejecutar } = crearPersistenciaFalsa([[], []]);
        await new EstadisticasMetasProyecto(persistencia).ejecutar({ idUsuario: 7, idProyecto: 3, desde: '2026-01' });
        expect(ejecutar).toHaveBeenCalledTimes(2);
        const [sqlMes, valoresMes] = ejecutar.mock.calls[0];
        const [sqlMiembro, valoresMiembro] = ejecutar.mock.calls[1];
        expect(sqlMes).toContain('GROUP BY mes ORDER BY mes');
        expect(sqlMiembro).toContain('GROUP BY completada_por ORDER BY completadas DESC');
        expect(valoresMiembro).toEqual(valoresMes);
    });

    it('la consulta por mes excluye trasladadas del total y las informa aparte', async () => {
        const { persistencia, ejecutar } = crearPersistenciaFalsa([[], []]);
        await new EstadisticasMetasProyecto(persistencia).ejecutar({ idUsuario: 7 });
        const sql: string = ejecutar.mock.calls[0][0];
        expect(sql).toContain('COUNT(*) FILTER (WHERE NOT trasladada)');
        expect(sql).toContain('COUNT(*) FILTER (WHERE completada AND NOT trasladada)');
        expect(sql).toContain('COUNT(*) FILTER (WHERE trasladada)');
        expect(sql).toContain('NOT m.completada AND EXISTS');
        expect(sql).toContain('t.id_meta_origen = m.id_meta');
    });

    it('la consulta por miembro solo cuenta completadas con responsable', async () => {
        const { persistencia, ejecutar } = crearPersistenciaFalsa([[], []]);
        await new EstadisticasMetasProyecto(persistencia).ejecutar({ idUsuario: 7 });
        const sql: string = ejecutar.mock.calls[1][0];
        expect(sql).toContain('AND completada AND completada_por IS NOT NULL');
    });

    it('rechaza rangos con formato inválido sin consultar', async () => {
        const { persistencia, ejecutar } = crearPersistenciaFalsa();
        await expect(new EstadisticasMetasProyecto(persistencia).ejecutar({ idUsuario: 7, desde: '2026-13' })).rejects.toThrow();
        expect(acceso).not.toHaveBeenCalled();
        expect(ejecutar).not.toHaveBeenCalled();
    });

    it('propaga errores de la persistencia', async () => {
        const { persistencia, ejecutar } = crearPersistenciaFalsa();
        ejecutar.mockRejectedValueOnce(new Error('BD caída'));
        await expect(new EstadisticasMetasProyecto(persistencia).ejecutar({ idUsuario: 7 })).rejects.toThrow('BD caída');
    });
});
