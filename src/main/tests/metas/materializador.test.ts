import { COLUMNAS_META, mesAFecha, materializarMeta } from '../../logicaPersistente/gestionDeMetas/materializador';
import { filaMeta } from './utilsTest';

describe('mesAFecha', () => {
    it('devuelve el primer día del mes', () => {
        expect(mesAFecha('2026-10')).toBe('2026-10-01');
        expect(mesAFecha('1999-01')).toBe('1999-01-01');
        expect(mesAFecha('2026-12')).toBe('2026-12-01');
    });
});

describe('COLUMNAS_META', () => {
    it('pide todas las columnas y el mes como texto AAAA-MM', () => {
        expect(COLUMNAS_META).toContain('*');
        expect(COLUMNAS_META).toContain(`to_char(mes, 'YYYY-MM') AS mes_texto`);
    });
    it('calcula trasladada_a solo para metas no completadas', () => {
        expect(COLUMNAS_META).toContain('AS trasladada_a');
        expect(COLUMNAS_META).toContain('t.id_meta_origen = metas.id_meta');
        expect(COLUMNAS_META).toContain('NOT metas.completada');
    });
});

it('mapea todas las columnas a la entidad Meta', () => {
    const fecha = new Date('2026-10-05T10:00:00Z');
    const fila = filaMeta({
        id_meta: 10, id_proyecto: 3, titulo: 'T', descripcion: 'D', mes_texto: '2026-11',
        completada: true, fecha_completada: fecha, completada_por_global: 9, orden: 4, creada_por_global: 8,
        trasladada_a: '2026-12', id_meta_origen: 2,
    });
    expect(materializarMeta(fila)).toEqual({
        idMeta: 10, idProyecto: 3, titulo: 'T', descripcion: 'D', mes: '2026-11',
        completada: true, fechaCompletada: fecha, completadaPor: 9, orden: 4, creadaPor: 8,
        fechaCreacion: fila.fecha_creacion, fechaLimite: null, trasladadaA: '2026-12', idMetaOrigen: 2,
    });
});

    it('usa mes_texto y no la columna mes (DATE)', () => {
        const meta = materializarMeta(filaMeta({ mes: new Date('2026-10-01T00:00:00Z'), mes_texto: '2026-10' }));
        expect(meta.mes).toBe('2026-10');
    });

    it('convierte null/undefined en null para los campos opcionales', () => {
        const fila: any = filaMeta();
        delete fila.id_proyecto;
        delete fila.descripcion;
        delete fila.fecha_completada;
        delete fila.completada_por_global;
        delete fila.trasladada_a;
        delete fila.id_meta_origen;
        const meta = materializarMeta(fila);
        expect(meta.idProyecto).toBeNull();
        expect(meta.descripcion).toBeNull();
        expect(meta.fechaCompletada).toBeNull();
        expect(meta.completadaPor).toBeNull();
        expect(meta.trasladadaA).toBeNull();
        expect(meta.idMetaOrigen).toBeNull();
    });

    it('conserva completada=false y orden=0 (valores falsy válidos)', () => {
        const meta = materializarMeta(filaMeta({ completada: false, orden: 0 }));
        expect(meta.completada).toBe(false);
        expect(meta.orden).toBe(0);
    });

    it('conserva idProyecto=0 sin convertirlo en null', () => {
        expect(materializarMeta(filaMeta({ id_proyecto: 0 })).idProyecto).toBe(0);
    });
