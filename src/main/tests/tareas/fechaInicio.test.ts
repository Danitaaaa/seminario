import { describe, it, expect, vi } from 'vitest';
import { CrearTareaDTOSchema, ModificarTareaDTOSchema } from '../../logicaPersistente/gestionDeTareas/dto';
import { CrearTarea } from '../../logicaPersistente/gestionDeTareas/crearTarea';
import { ModificarTarea } from '../../logicaPersistente/gestionDeTareas/modificarTarea';
import { materializarTarea } from '../../logicaPersistente/gestionDeTareas/materializador';

// Fila de una tarea personal del usuario 7, como la devuelve la base.
const fila = (extra: Record<string, unknown> = {}) => ({
  id_tarea: 1, id_global: 'g-1', id_proyecto: null, titulo: 'Armar presentación', descripcion: null,
  prioridad: 'media', fecha_limite: '2026-10-30', fecha_inicio: '2026-10-24', id_asignado: null,
  completada: false, fecha_completada: null, completada_por: null, orden: 0, creada_por: 7,
  fecha_creacion: new Date('2026-10-20T12:00:00Z'), ...extra,
});

// Persistencia falsa: la transacción usa el mismo `ejecutar`, que responde según el SQL.
function persistenciaFalsa(responder: (sql: string, valores: unknown[]) => any[]) {
  const ejecutar = vi.fn(async (sql: string, valores: unknown[] = []) => responder(sql, valores));
  const p: any = { ejecutar };
  p.transaccion = async (trabajo: (tx: any) => Promise<unknown>) => trabajo(p);
  return p;
}

describe('Tareas: fecha de inicio en el DTO', () => {
  const base = { idUsuario: 7, titulo: 'Tarea' };

  it('acepta inicio antes o igual que la fecha límite', () => {
    expect(CrearTareaDTOSchema.safeParse({ ...base, fechaInicio: '2026-10-24', fechaLimite: '2026-10-30' }).success).toBe(true);
    expect(CrearTareaDTOSchema.safeParse({ ...base, fechaInicio: '2026-10-30', fechaLimite: '2026-10-30' }).success).toBe(true);
  });

  it('rechaza inicio después de la fecha límite', () => {
    expect(CrearTareaDTOSchema.safeParse({ ...base, fechaInicio: '2026-11-02', fechaLimite: '2026-10-30' }).success).toBe(false);
  });

  it('acepta solo una de las dos fechas', () => {
    expect(CrearTareaDTOSchema.safeParse({ ...base, fechaInicio: '2026-11-02' }).success).toBe(true);
  });

  it('rechaza fechas que no existen', () => {
    expect(CrearTareaDTOSchema.safeParse({ ...base, fechaInicio: '2026-02-30' }).success).toBe(false);
    expect(ModificarTareaDTOSchema.safeParse({ idTarea: 1, idUsuario: 7, fechaInicio: '2026-13-01' }).success).toBe(false);
  });
});

describe('Tareas: materializador', () => {
  it('pasa fecha_inicio a fechaInicio y usa null si no hay', () => {
    expect(materializarTarea(fila()).fechaInicio).toBe('2026-10-24');
    expect(materializarTarea(fila({ fecha_inicio: null })).fechaInicio).toBeNull();
  });
});

describe('Tareas: CrearTarea con fecha de inicio', () => {
  it('guarda la fecha de inicio como noveno parámetro', async () => {
    const p = persistenciaFalsa((sql) => {
      if (sql.includes('INSERT INTO tareas')) return [fila()];
      if (sql.includes('MAX(orden)') || sql.includes('orden')) return [{ siguiente: 0, orden: 0 }];
      return [];
    });
    const tarea = await new CrearTarea(p).ejecutar({
      idUsuario: 7, titulo: 'Armar presentación', fechaInicio: '2026-10-24', fechaLimite: '2026-10-30',
    });
    const insert = p.ejecutar.mock.calls.find(([sql]: [string]) => sql.includes('INSERT INTO tareas'));
    expect(insert[0]).toContain('fecha_inicio');
    expect(insert[1][8]).toBe('2026-10-24');
    expect(tarea.fechaInicio).toBe('2026-10-24');
  });

  it('sin fecha de inicio manda null', async () => {
    const p = persistenciaFalsa((sql) => (sql.includes('INSERT INTO tareas') ? [fila({ fecha_inicio: null })] : [{ siguiente: 0, orden: 0 }]));
    await new CrearTarea(p).ejecutar({ idUsuario: 7, titulo: 'Sin fechas' });
    const insert = p.ejecutar.mock.calls.find(([sql]: [string]) => sql.includes('INSERT INTO tareas'));
    expect(insert[1][8]).toBeNull();
  });
});

describe('Tareas: ModificarTarea con fecha de inicio', () => {
  // La tarea guardada empieza el 24/10 y vence el 30/10.
  const guardada = (sql: string) => {
    if (sql.includes('UPDATE tareas')) return [fila({ fecha_inicio: '2026-10-26' })];
    if (sql.includes('FROM tareas WHERE id_tarea')) return [fila()];
    return [];
  };

  it('cambia la fecha de inicio', async () => {
    const p = persistenciaFalsa(guardada);
    const tarea = await new ModificarTarea(p).ejecutar({ idTarea: 1, idUsuario: 7, fechaInicio: '2026-10-26' });
    const update = p.ejecutar.mock.calls.find(([sql]: [string]) => sql.includes('UPDATE tareas'));
    expect(update[0]).toMatch(/fecha_inicio = \$1/);
    expect(update[1]).toEqual(['2026-10-26', 1]);
    expect(tarea.fechaInicio).toBe('2026-10-26');
  });

  it('no deja poner un inicio después de la fecha límite que ya estaba guardada', async () => {
    const p = persistenciaFalsa(guardada);
    await expect(
      new ModificarTarea(p).ejecutar({ idTarea: 1, idUsuario: 7, fechaInicio: '2026-11-05' })
    ).rejects.toThrow(/posterior a la fecha límite/);
    expect(p.ejecutar.mock.calls.some(([sql]: [string]) => sql.includes('UPDATE tareas'))).toBe(false);
  });

  it('no deja adelantar la fecha límite antes del inicio guardado', async () => {
    const p = persistenciaFalsa(guardada);
    await expect(
      new ModificarTarea(p).ejecutar({ idTarea: 1, idUsuario: 7, fechaLimite: '2026-10-20' })
    ).rejects.toThrow(/posterior a la fecha límite/);
  });

  it('borrar la fecha límite deja cualquier inicio', async () => {
    const p = persistenciaFalsa(guardada);
    await new ModificarTarea(p).ejecutar({ idTarea: 1, idUsuario: 7, fechaLimite: null, fechaInicio: '2026-12-01' });
    expect(p.ejecutar.mock.calls.some(([sql]: [string]) => sql.includes('UPDATE tareas'))).toBe(true);
  });

  it('no deja editar la tarea personal de otro usuario', async () => {
    const p = persistenciaFalsa(guardada);
    await expect(
      new ModificarTarea(p).ejecutar({ idTarea: 1, idUsuario: 99, fechaInicio: '2026-10-25' })
    ).rejects.toThrow(/permiso/);
  });
});
