import { describe, it, expect, vi } from 'vitest';
import { ListarMetasDTOSchema, CrearMetaDTOSchema } from '../../logicaPersistente/gestionDeMetas/dto';
import { ListarMetas } from '../../logicaPersistente/gestionDeMetas/listarMetas';

function persistenciaFalsa(filas: any[] = []) {
  const ejecutar = vi.fn(async () => filas);
  const p: any = { ejecutar };
  p.transaccion = async (trabajo: (tx: any) => Promise<unknown>) => trabajo(p);
  return p;
}

describe('Metas: DTO', () => {
  it('pide un mes o un rango de fechas', () => {
    expect(ListarMetasDTOSchema.safeParse({ idUsuario: 7 }).success).toBe(false);
    expect(ListarMetasDTOSchema.safeParse({ idUsuario: 7, desde: '2026-10-01' }).success).toBe(false);
    expect(ListarMetasDTOSchema.safeParse({ idUsuario: 7, mes: '2026-10' }).success).toBe(true);
    expect(ListarMetasDTOSchema.safeParse({ idUsuario: 7, desde: '2026-10-01', hasta: '2026-10-31' }).success).toBe(true);
  });

  it('acepta una meta con fecha límite o sin ella', () => {
    const base = { idUsuario: 7, titulo: 'Leer capítulo 3', mes: '2026-10' };
    expect(CrearMetaDTOSchema.safeParse({ ...base, fechaLimite: '2026-10-15' }).success).toBe(true);
    expect(CrearMetaDTOSchema.safeParse({ ...base, fechaLimite: null }).success).toBe(true);
    expect(CrearMetaDTOSchema.safeParse({ ...base, fechaLimite: '15/10/2026' }).success).toBe(false);
  });
});

describe('Metas: ListarMetas', () => {
  it('por mes: metas personales del usuario, en el orden que eligió', async () => {
    const p = persistenciaFalsa();
    await new ListarMetas(p).ejecutar({ idUsuario: 7, mes: '2026-10' });
    const [sql, valores] = p.ejecutar.mock.calls[0];
    expect(sql).toMatch(/id_proyecto IS NULL AND creada_por = \$1/);
    expect(sql).toMatch(/mes = \$2::date/);
    expect(sql).toMatch(/ORDER BY orden, id_meta/);
    expect(valores[0]).toBe(7);
  });

  it('por rango: las que vencen entre dos fechas, ordenadas por fecha', async () => {
    const p = persistenciaFalsa();
    await new ListarMetas(p).ejecutar({ idUsuario: 7, desde: '2026-10-01', hasta: '2026-10-31' });
    const [sql, valores] = p.ejecutar.mock.calls[0];
    expect(sql).toMatch(/fecha_limite BETWEEN \$2::date AND \$3::date/);
    expect(sql).toMatch(/ORDER BY fecha_limite/);
    expect(valores).toEqual([7, '2026-10-01', '2026-10-31']);
  });
});
