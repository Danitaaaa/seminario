import { describe, it, expect, beforeEach } from 'vitest';
import { IniciarSesionEstudio } from '../../logicaPersistente/gestionDeSesionEstudio/iniciarSesionEstudio';
import { PausarSesionEstudio } from '../../logicaPersistente/gestionDeSesionEstudio/pausarSesionEstudio';
import { ReanudarSesionEstudio } from '../../logicaPersistente/gestionDeSesionEstudio/reanudarSesionEstudio';
import { EliminarSesionEstudio } from '../../logicaPersistente/gestionDeSesionEstudio/eliminarSesionEstudio';
import { BuscarSesionesSuperpuestas } from '../../logicaPersistente/gestionDeSesionEstudio/buscarSesionesSuperpuestas';
import { GestionarPestanas } from '../../logicaPersistente/gestionDeSesionEstudio/gestionarPestanas';
import { crearPersistenciaFalsa, errorPostgres, filaSesion } from './datosPrueba';

const USUARIO = 7;
const SESION = 1;

describe('Casos de uso de la sesión de estudio', () => {
  let persistencia: ReturnType<typeof crearPersistenciaFalsa>;
  beforeEach(() => {
    persistencia = crearPersistenciaFalsa();
  });

  it('7. Iniciar pasa la sesión a "en curso"', async () => {
    persistencia.ejecutar
      .mockResolvedValueOnce([{ id_sesion_estudio: SESION }])
      .mockResolvedValueOnce([filaSesion({ estado: 'en_curso' })]);
    const sesion = await new IniciarSesionEstudio(persistencia as any).ejecutar(USUARIO, SESION);

    const [sql, valores] = persistencia.ejecutar.mock.calls[0];
    expect(sql).toContain("SET estado = 'en_curso'");
    expect(valores).toEqual([SESION, USUARIO]);
    expect(sesion.estado).toBe('en_curso');
  });

  it('8. No se puede iniciar una sesión si ya hay otra en curso', async () => {
    persistencia.ejecutar.mockRejectedValueOnce(errorPostgres('23505'));
    await expect(new IniciarSesionEstudio(persistencia as any).ejecutar(USUARIO, SESION)).rejects.toThrow(
      'Ya tenés una sesión de estudio en curso. Finalizala antes de iniciar otra.'
    );
  });

  it('9. No se puede pausar una sesión que ya está pausada', async () => {
    persistencia.ejecutar.mockResolvedValueOnce([]);
    await expect(new PausarSesionEstudio(persistencia as any).ejecutar(USUARIO, SESION)).rejects.toThrow(
      'La sesión no está en curso o ya está pausada.'
    );
  });

  it('10. No se puede reanudar una sesión que no está pausada', async () => {
    persistencia.ejecutar.mockResolvedValueOnce([]);
    await expect(new ReanudarSesionEstudio(persistencia as any).ejecutar(USUARIO, SESION)).rejects.toThrow(
      'La sesión no está pausada.'
    );
  });

  it('11. No se puede eliminar una sesión en curso', async () => {
    persistencia.ejecutar.mockResolvedValueOnce([]);
    await expect(new EliminarSesionEstudio(persistencia as any).ejecutar(USUARIO, SESION)).rejects.toThrow(
      'La sesión no existe o está en curso.'
    );
  });

  it('12. Busca sesiones superpuestas sin contar las completadas ni la propia sesión', async () => {
    persistencia.ejecutar.mockResolvedValueOnce([filaSesion({ id_sesion_estudio: 2 })]);
    const fecha = new Date('2026-10-28T18:30:00Z');
    const encontradas = await new BuscarSesionesSuperpuestas(persistencia as any).ejecutar(USUARIO, {
      fechaProgramada: fecha,
      duracion: 60,
      excluirIdSesion: SESION,
    });

    const [sql, valores] = persistencia.ejecutar.mock.calls[0];
    expect(sql).toContain("s.estado <> 'completada'");
    expect(valores).toEqual([USUARIO, fecha, 60, SESION]);
    expect(encontradas).toHaveLength(1);
  });

  it('13. No se puede eliminar la última pestaña de una sesión', async () => {
    persistencia.ejecutar.mockResolvedValueOnce([]);
    await expect(new GestionarPestanas(persistencia as any).eliminar(USUARIO, 4)).rejects.toThrow(
      'No se puede eliminar: la sesión necesita al menos una pestaña.'
    );
  });
});