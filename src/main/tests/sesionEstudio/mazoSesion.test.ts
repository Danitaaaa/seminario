import { describe, it, expect, vi } from 'vitest';
import { ModificarSesionEstudio } from '../../logicaPersistente/gestionDeSesionEstudio/modificarSesionEstudio';
import { crearSesionEstudioSchema, modificarSesionEstudioSchema } from '../../logicaPersistente/gestionDeSesionEstudio/dto';

const filaSesion = {
  id_sesion_estudio: 3, id_usuario: 7, nombre: 'Repaso', duracion: 60, id_materia: 1, materia_nombre: 'Física',
  metodos_estudio: [{ idTipoMetodoEstudio: 2, nombre: 'Flashcards' }], estado: 'sin_empezar', metas: [], id_deck: 5,
};

describe('Sesiones: mazo de flashcards', () => {
  it('al crear, el mazo es opcional', () => {
    const base = { nombre: 'S', idMateria: 1, duracion: 60, fechaProgramada: '2026-10-28T10:00:00' };
    expect(crearSesionEstudioSchema.parse(base).idDeck).toBeNull();
    expect(crearSesionEstudioSchema.parse({ ...base, idDeck: 5 }).idDeck).toBe(5);
  });

  it('al modificar, null quita el mazo y no mandarlo lo deja como estaba', () => {
    expect(modificarSesionEstudioSchema.parse({ idSesion: 3, idDeck: null }).idDeck).toBeNull();
    expect('idDeck' in modificarSesionEstudioSchema.parse({ idSesion: 3 })).toBe(false);
  });

  it('revisa que el mazo sea del usuario antes de guardarlo', async () => {
    const ejecutar = vi.fn()
      .mockResolvedValueOnce([{ '?column?': 1 }])        // el mazo es del usuario
      .mockResolvedValueOnce([{ id_sesion_estudio: 3 }]) // UPDATE
      .mockResolvedValueOnce([filaSesion]);              // sesión actualizada
    const sesion = await new ModificarSesionEstudio({ ejecutar } as any).ejecutar(7, { idSesion: 3, idDeck: 5 });
    expect(ejecutar.mock.calls[0][1]).toEqual([5, 7]);
    const [sql, valores] = ejecutar.mock.calls[1];
    expect(sql).toContain('id_deck = CASE WHEN $11::boolean THEN $12::int ELSE id_deck END');
    expect(valores.slice(10)).toEqual([true, 5]);
    expect(sesion.idDeck).toBe(5);
  });

  it('rechaza un mazo de otro usuario', async () => {
    const ejecutar = vi.fn().mockResolvedValueOnce([]);
    await expect(new ModificarSesionEstudio({ ejecutar } as any).ejecutar(7, { idSesion: 3, idDeck: 99 }))
      .rejects.toThrow(/mazo de flashcards elegido no existe/);
    expect(ejecutar).toHaveBeenCalledTimes(1);
  });

  it('reemplaza los métodos de estudio si vienen en los cambios', async () => {
    const ejecutar = vi.fn()
      .mockResolvedValueOnce([{ id_sesion_estudio: 3 }]) // UPDATE
      .mockResolvedValueOnce([])                         // métodos
      .mockResolvedValueOnce([filaSesion]);              // sesión actualizada
    await new ModificarSesionEstudio({ ejecutar } as any).ejecutar(7, { idSesion: 3, idsMetodosEstudio: [2, 1, 2] });
    const [sql, valores] = ejecutar.mock.calls[1];
    expect(sql).toMatch(/DELETE FROM sesion_estudio_metodo_estudio/);
    expect(sql).toMatch(/ON CONFLICT DO NOTHING/);
    expect(valores).toEqual([3, [2, 1]]);
  });

  it('si no vienen métodos, no los toca', async () => {
    const ejecutar = vi.fn()
      .mockResolvedValueOnce([{ id_sesion_estudio: 3 }])
      .mockResolvedValueOnce([filaSesion]);
    await new ModificarSesionEstudio({ ejecutar } as any).ejecutar(7, { idSesion: 3, nombre: 'Otro' });
    expect(ejecutar).toHaveBeenCalledTimes(2);
  });
});
