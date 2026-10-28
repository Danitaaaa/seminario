import { describe, it, expect, vi } from 'vitest';
import { ResumenProyectos } from '../../logicaPersistente/gestionDeEstadisticas/resumenProyectos';
import { ResumenSesionesEstudio } from '../../logicaPersistente/gestionDeEstadisticas/resumenSesiones';
import { ResumenDeMaterial } from '../../logicaPersistente/gestionDeEstadisticas/resumenMaterial';
import {
  resumenProyectosSchema,
  resumenSesionesSchema,
  resumenMaterialSchema,
} from '../../logicaPersistente/gestionDeEstadisticas/dto';

// Persistencia falsa: devuelve las respuestas en el orden en que se piden las consultas.
function persistenciaFalsa(respuestas: any[][]) {
  const ejecutar = vi.fn();
  respuestas.forEach((r) => ejecutar.mockResolvedValueOnce(r));
  return { ejecutar } as any;
}

describe('Estadísticas: DTO', () => {
  it('acepta un mes y un día válidos para los proyectos', () => {
    expect(resumenProyectosSchema.safeParse({ idUsuario: 1, mes: '2026-10', hoy: '2026-10-28', desde: '2026-05-01', desfaseMinutos: -180 }).success).toBe(true);
  });

  it('rechaza un mes inválido', () => {
    expect(resumenProyectosSchema.safeParse({ idUsuario: 1, mes: '2026-13', hoy: '2026-10-28', desde: '2026-05-01', desfaseMinutos: -180 }).success).toBe(false);
  });

  it('rechaza un desfase horario fuera de rango', () => {
    expect(resumenSesionesSchema.safeParse({ idUsuario: 1, desde: '2026-05-01', desfaseMinutos: 900 }).success).toBe(false);
    expect(resumenSesionesSchema.safeParse({ idUsuario: 1, desde: '2026-05-01', desfaseMinutos: -180 }).success).toBe(true);
  });

  it('exige un usuario positivo para el material', () => {
    expect(resumenMaterialSchema.safeParse({ idUsuario: 0 }).success).toBe(false);
  });
});

describe('Estadísticas: ResumenProyectos', () => {
  it('sin proyectos no hace la segunda consulta', async () => {
    const p = persistenciaFalsa([[]]);
    const r = await new ResumenProyectos(p).ejecutar({ idUsuario: 7, mes: '2026-10', hoy: '2026-10-28', desde: '2026-05-01', desfaseMinutos: -180 });
    expect(r).toEqual([]);
    expect(p.ejecutar).toHaveBeenCalledTimes(1);
    expect(p.ejecutar.mock.calls[0][1]).toEqual([7, '2026-10-28', '2026-10']);
  });

  it('arma el resumen y reparte el aporte y las tareas por mes de cada proyecto', async () => {
    const p = persistenciaFalsa([
      [
        { id_proyecto: 1, nombre: 'Seminario', total: 4, hechas: 2, pendientes: 2, vencidas: 1, sin_asignar: 1, metas_total: 3, metas_completadas: 1 },
        { id_proyecto: 2, nombre: 'Base de Datos', total: 0, hechas: 0, pendientes: 0, vencidas: 0, sin_asignar: 0, metas_total: 0, metas_completadas: 0 },
      ],
      [
        { id_proyecto: 1, id_usuario: 7, nombre: 'Dana', hechas: 2, pendientes: 1 },
        { id_proyecto: 1, id_usuario: 8, nombre: 'Caro', hechas: 0, pendientes: 0 },
        { id_proyecto: 2, id_usuario: 7, nombre: 'Dana', hechas: 0, pendientes: 0 },
      ],
      [
        { id_proyecto: 1, mes: '2026-09', hechas: 1 },
        { id_proyecto: 1, mes: '2026-10', hechas: 1 },
      ],
    ]);
    const [seminario, base] = await new ResumenProyectos(p).ejecutar({
      idUsuario: 7, mes: '2026-10', hoy: '2026-10-28', desde: '2026-05-01', desfaseMinutos: -180,
    });

    expect(p.ejecutar.mock.calls[1][1]).toEqual([[1, 2]]);
    expect(p.ejecutar.mock.calls[2][1]).toEqual([[1, 2], '2026-05-01', -180]);
    expect(p.ejecutar.mock.calls[2][0]).toContain('make_interval(mins => $3::int)');
    expect(seminario.tareas).toEqual({ total: 4, hechas: 2, pendientes: 2, vencidas: 1, sinAsignar: 1 });
    expect(seminario.metasMes).toEqual({ total: 3, completadas: 1 });
    expect(seminario.integrantes.map((i) => i.nombre)).toEqual(['Dana', 'Caro']);
    expect(seminario.porMes).toEqual([{ mes: '2026-09', hechas: 1 }, { mes: '2026-10', hechas: 1 }]);
    expect(base.integrantes).toHaveLength(1);
    expect(base.porMes).toEqual([]);
  });

  it('solo cuenta proyectos donde el usuario sigue activo', async () => {
    const p = persistenciaFalsa([[]]);
    await new ResumenProyectos(p).ejecutar({ idUsuario: 7, mes: '2026-10', hoy: '2026-10-28', desde: '2026-05-01', desfaseMinutos: -180 });
    expect(p.ejecutar.mock.calls[0][0]).toMatch(/fecha_baja IS NULL/);
  });
});

describe('Estadísticas: ResumenSesionesEstudio', () => {
  it('manda usuario, fecha y desfase en todas las consultas y usa la hora local', async () => {
    const p = persistenciaFalsa([
      [{ completadas: 9, atrasadas: 2, minutos_estudiados: 742, minutos_planificados: 900 }],
      [{ total: 20, completados: 15 }],
      [{ mes: '2026-09', minutos: 180 }, { mes: '2026-10', minutos: 240 }],
      [{ materia: 'Física', minutos: 222 }],
    ]);
    const r = await new ResumenSesionesEstudio(p).ejecutar({ idUsuario: 7, desde: '2026-05-01', desfaseMinutos: -180 });

    expect(p.ejecutar).toHaveBeenCalledTimes(4);
    for (const [sql, valores] of p.ejecutar.mock.calls) {
      expect(valores).toEqual([7, '2026-05-01', -180]);
      expect(sql).toContain("AT TIME ZONE 'UTC'");
      expect(sql).toContain('make_interval(mins => $3::int)');
    }
    expect(r.sesiones).toEqual({ completadas: 9, atrasadas: 2 });
    expect(r.minutos).toEqual({ estudiados: 742, planificados: 900 });
    expect(r.objetivos).toEqual({ total: 20, completados: 15 });
    expect(r.porMes).toHaveLength(2);
    expect(r.porMateria[0]).toEqual({ materia: 'Física', minutos: 222 });
  });

  it('descuenta el tiempo en pausa', async () => {
    const p = persistenciaFalsa([
      [{ completadas: 0, atrasadas: 0, minutos_estudiados: 0, minutos_planificados: 0 }],
      [{ total: 0, completados: 0 }],
      [],
      [],
    ]);
    await new ResumenSesionesEstudio(p).ejecutar({ idUsuario: 7, desde: '2026-05-01', desfaseMinutos: 0 });
    expect(p.ejecutar.mock.calls[0][0]).toContain('segundos_pausados');
  });
});

describe('Estadísticas: ResumenDeMaterial', () => {
  it('recorre las carpetas desde la raíz de Material y convierte los bytes a número', async () => {
    const p = persistenciaFalsa([[{ archivos: 47, bytes: '185783091', carpetas: 9 }]]);
    const r = await new ResumenDeMaterial(p).ejecutar();

    expect(p.ejecutar.mock.calls[0][0]).toContain('WITH RECURSIVE');
    expect(p.ejecutar.mock.calls[0][1]).toEqual([1]);
    expect(r).toEqual({ archivos: 47, bytes: 185783091, carpetas: 9 });
  });
});
