import { describe, expect, it } from 'vitest';
import { obtenerAvisoGuia } from './FaceVoiceGuidance';
import type { PosicionRostro } from './FacePositionAnalyzer';

const centrado: PosicionRostro = {
  distancia: 'OK',
  horizontal: 'OK',
  vertical: 'OK',
  cercaniaCentro: 1,
};

describe('obtenerAvisoGuia', () => {
  it('prioriza distancia sobre dirección horizontal y vertical', () => {
    const aviso = obtenerAvisoGuia(
      {
        distancia: 'MUY_LEJOS',
        horizontal: 'IZQUIERDA',
        vertical: 'ARRIBA',
        cercaniaCentro: 0.2,
      },
      { clave: null, ultimoAviso: null },
      1000,
    );

    expect(aviso.mensaje).toBe('Acercate');
  });

  it('prioriza horizontal sobre vertical y emite un solo mensaje', () => {
    const aviso = obtenerAvisoGuia(
      {
        distancia: 'OK',
        horizontal: 'DERECHA',
        vertical: 'ABAJO',
        cercaniaCentro: 0.5,
      },
      { clave: null, ultimoAviso: null },
      1000,
    );

    expect(aviso.mensaje).toBe('Movete hacia la derecha');
  });

  it('avisa cuando cambia el estado y limita recordatorios a 2.5 segundos', () => {
    const inicial = obtenerAvisoGuia(null, { clave: null, ultimoAviso: null }, 1000);
    const sinCambio = obtenerAvisoGuia(null, inicial.siguienteEstado, 2000);
    const recordatorio = obtenerAvisoGuia(null, inicial.siguienteEstado, 3500);
    const cambio = obtenerAvisoGuia(centrado, inicial.siguienteEstado, 2000);

    expect(inicial.mensaje).toBe('No te veo');
    expect(sinCambio.mensaje).toBeNull();
    expect(recordatorio.mensaje).toBe('No te veo');
    expect(cambio.mensaje).toBeNull();
  });
});
