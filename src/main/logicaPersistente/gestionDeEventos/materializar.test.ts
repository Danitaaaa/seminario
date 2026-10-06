import { describe, it, expect } from 'vitest';
import { materializarEvento } from './materializador';

describe('Mapeador (materializador.ts)', () => {
  it('16. Reemplazar nulos por defaults en materializador', () => {
    const filaBD = {
      id: '1',
      usuario_id: '123',
      titulo: 'Reunión',
      categoria: null,
      prioridad: undefined,
      notificaciones_activas: null,
      recordatorios: null
    };

    const resultado = materializarEvento(filaBD);
    console.log('[TEST 16 OUTPUT] Objeto materializado con valores por defecto:', JSON.stringify(resultado, null, 2));

    expect(resultado.categoria).toBe('Otro');
    expect(resultado.prioridad).toBe('media');
    expect(resultado.notificacionesActivas).toBe(false);
    expect(resultado.recordatorios).toEqual([]);
  });

  it('22. Materializar array de recordatorios en JSON malformado o vacío', () => {
    const filaNull = materializarEvento({ recordatorios: null });
    const filaInvalido = materializarEvento({ recordatorios: '{json_invalido}' });

    console.log('[TEST 22 OUTPUT] Recordatorios desde null:', filaNull.recordatorios);
    console.log('[TEST 22 OUTPUT] Recordatorios desde JSON malformado:', filaInvalido.recordatorios);

    expect(filaNull.recordatorios).toEqual([]);
    expect(filaInvalido.recordatorios).toEqual([]);
  });
});