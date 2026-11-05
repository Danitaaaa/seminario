import { describe, it, expect, vi } from 'vitest';
// Se prueba el materializador real, directamente (materializarTarea / COLUMNAS_TAREA) y una vez a través
// de buscarTareaEnTx para comprobar que el caso de uso lo aplica.
import { materializarTarea, COLUMNAS_TAREA } from '../../logicaPersistente/gestionDeTareas/materializador';
import { buscarTareaEnTx, Tx } from '../../logicaPersistente/gestionDeTareas/buscarTarea';
import { filaTarea } from './pruebasComunes';

const materializar = (sobrescribir: Record<string, unknown> = {}, borrar: string[] = []) => {
    const fila: any = filaTarea(sobrescribir);
    for (const campo of borrar) delete fila[campo];
    return materializarTarea(fila);
};

describe('Materializador de Tareas', () => {
    it('convierte las columnas de la base a las propiedades de la tarea', () => {
        const t = materializar({
            id_tarea: 42, id_global: 'g-42', id_proyecto: 10, titulo: 'X', prioridad: 'alta', orden: 3,
            completada: true, fecha_completada: new Date('2026-02-01T00:00:00Z'), id_asignado: null,
            fecha_inicio: '2026-01-10', fecha_creacion: new Date('2026-01-01T00:00:00Z'),
        });
        expect(t).toMatchObject({
            idTarea: 42, idGlobal: 'g-42', idProyecto: 10, idUsuario: null, titulo: 'X', prioridad: 'alta', orden: 3,
            completada: true, idAsignado: null, fechaInicio: '2026-01-10',
        });
        expect(t.fechaCreacion).toEqual(new Date('2026-01-01T00:00:00Z'));
    });

    it('a través de buscarTareaEnTx devuelve la fila de la base convertida a Tarea', async () => {
        const tx = { ejecutar: vi.fn().mockResolvedValue([filaTarea({ id_tarea: 42, titulo: 'X' })]) } as unknown as Tx;
        const t = await buscarTareaEnTx(tx, 42);
        expect(t).toMatchObject({ idTarea: 42, titulo: 'X' });
    });

    describe('id_asignado_global (origen del bug 7: tareas asignadas que salían en "Sin asignar")', () => {
        it('null queda en null', () => {
            expect(materializar({ id_asignado_global: null }).idAsignadoGlobal).toBeNull();
        });

        it('undefined (columna ausente) se normaliza a null', () => {
            expect(materializar({}, ['id_asignado_global']).idAsignadoGlobal).toBeNull();
        });

        it('un asignado se conserva', () => {
            expect(materializar({ id_asignado_global: 8 }).idAsignadoGlobal).toBe(8);
        });

        it('sin asignar no se atribuye al dueño de la tarea', () => {
            expect(materializar({ id_asignado_global: null, id_usuario: 1 }).idAsignadoGlobal).toBeNull();
        });

        it('el asignado no se pisa con el dueño', () => {
            expect(materializar({ id_asignado_global: 8, id_usuario: 1 }).idAsignadoGlobal).toBe(8);
        });

        it('id_asignado_global 0 no se confunde con "sin asignar"', () => {
            expect(materializar({ id_asignado_global: 0 }).idAsignadoGlobal).toBe(0);
        });
    });

    describe('campos opcionales', () => {
        it('descripcion y fecha_limite ausentes o null se normalizan a null', () => {
            expect(materializar({}, ['descripcion', 'fecha_limite'])).toMatchObject({ descripcion: null, fechaLimite: null });
            expect(materializar({ descripcion: null, fecha_limite: null })).toMatchObject({ descripcion: null, fechaLimite: null });
        });

        it('conserva descripción y la fecha límite como texto AAAA-MM-DD (sin desfase de zona horaria)', () => {
            const t = materializar({ descripcion: 'd', fecha_limite: '2026-12-01' });
            expect(t.descripcion).toBe('d');
            expect(t.fechaLimite).toBe('2026-12-01');
        });
    });

    describe('tarea personal y de proyecto', () => {
        it('id_proyecto null queda en null (tarea personal)', () => {
            expect(materializar({ id_proyecto: null }).idProyecto).toBeNull();
        });

        it('id_proyecto se conserva en una tarea de proyecto', () => {
            expect(materializar({ id_proyecto: 10 }).idProyecto).toBe(10);
        });
    });

    describe('estado de cumplimiento (tests 101 y 102)', () => {
        it('tarea hecha conserva cuándo la completó', () => {
            const fecha = new Date('2026-02-01T00:00:00Z');
            const t = materializar({ completada: true, fecha_completada: fecha });
            expect(t.completada).toBe(true);
            expect(t.fechaCompletada).toEqual(fecha);
        });

        it('tarea pendiente no trae fecha de cumplimiento', () => {
            const t = materializar({ completada: false, fecha_completada: null });
            expect(t.completada).toBe(false);
            expect(t.fechaCompletada).toBeNull();
        });

        it('fecha de cumplimiento ausente se normaliza a null', () => {
            const t = materializar({ completada: false }, ['fecha_completada']);
            expect(t.fechaCompletada).toBeNull();
        });
    });

    it.each(['alta', 'media', 'baja'])('conserva la prioridad "%s"', p => {
        expect(materializar({ prioridad: p }).prioridad).toBe(p);
    });
});

describe('COLUMNAS_TAREA', () => {
    it('incluye todas las columnas que lee el materializador (si falta una, el RETURNING la pierde)', () => {
        for (const columna of Object.keys(filaTarea())) {
            expect(COLUMNAS_TAREA).toContain(columna);
        }
    });

    it('devuelve fecha_limite como texto AAAA-MM-DD para evitar desfases de zona horaria', () => {
        expect(COLUMNAS_TAREA).toMatch(/to_char\(\s*fecha_limite\s*,\s*'YYYY-MM-DD'\s*\)\s+AS\s+fecha_limite/i);
    });
});