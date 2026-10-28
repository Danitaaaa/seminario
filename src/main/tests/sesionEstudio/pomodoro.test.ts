import { describe, it, expect } from 'vitest';
import { calcularEstadoPomodoro } from '../../logicaNoPersistente/procesoSesionEstudio/pomodoro';

const config = { pomodoroMin: 35, descansoCortoMin: 10, descansoLargoMin: 15 };
const AHORA = Date.parse('2026-10-28T18:00:00.000Z');

describe('Cálculos del Pomodoro (pomodoro.ts)', () => {
  it('5. Con el Pomodoro corriendo, descuenta el tiempo que pasó desde el START', () => {
    const desde = new Date(AHORA - 90_000).toISOString(); // hace 90 segundos
    const e = calcularEstadoPomodoro(config, { fase: 'pomodoro', restanteSeg: null, corriendoDesde: desde, completados: 0 }, AHORA);
    expect(e.corriendo).toBe(true);
    expect(e.segundosRestantes).toBe(35 * 60 - 90);
  });

  it('6. El tiempo restante nunca es negativo', () => {
    const desde = new Date(AHORA - 3_600_000).toISOString(); // hace 1 hora
    const e = calcularEstadoPomodoro(config, { fase: 'pomodoro', restanteSeg: 100, corriendoDesde: desde, completados: 0 }, AHORA);
    expect(e.segundosRestantes).toBe(0);
  });
});