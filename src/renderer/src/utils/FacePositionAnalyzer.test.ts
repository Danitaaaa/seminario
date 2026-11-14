import { describe, expect, it } from 'vitest';
import { analizarPosicionRostro } from './FacePositionAnalyzer';

const frame = { width: 640, height: 480 };

describe('analizarPosicionRostro', () => {
  it('invierte la corrección horizontal para indicar el movimiento desde la perspectiva del usuario', () => {
    const rostroALaDerecha = analizarPosicionRostro(
      { x: 450, y: 170, width: 120, height: 140 },
      frame,
    );
    const rostroALaIzquierda = analizarPosicionRostro(
      { x: 70, y: 170, width: 120, height: 140 },
      frame,
    );

    expect(rostroALaDerecha.horizontal).toBe('IZQUIERDA');
    expect(rostroALaIzquierda.horizontal).toBe('DERECHA');
  });

  it('clasifica distancia, centrado y cercanía al centro ideal', () => {
    const centrado = analizarPosicionRostro(
      { x: 260, y: 180, width: 120, height: 120 },
      frame,
    );
    const lejos = analizarPosicionRostro(
      { x: 310, y: 230, width: 80, height: 90 },
      frame,
    );
    const cerca = analizarPosicionRostro(
      { x: 100, y: 60, width: 420, height: 360 },
      frame,
    );

    expect(centrado).toEqual({
      distancia: 'OK',
      horizontal: 'OK',
      vertical: 'OK',
      cercaniaCentro: 1,
    });
    expect(lejos.distancia).toBe('MUY_LEJOS');
    expect(cerca.distancia).toBe('MUY_CERCA');
    expect(cerca.cercaniaCentro).toBeGreaterThanOrEqual(0);
    expect(cerca.cercaniaCentro).toBeLessThanOrEqual(1);
  });
});
