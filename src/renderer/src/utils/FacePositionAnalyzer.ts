export interface CajaRostro {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TamañoFrame {
  width: number;
  height: number;
}

export interface ToleranciasRostro {
  anchoMinimoRelativo: number;
  anchoMaximoRelativo: number;
  toleranciaHorizontalRelativa: number;
  toleranciaVerticalRelativa: number;
}

export interface PosicionRostro {
  distancia: 'MUY_LEJOS' | 'MUY_CERCA' | 'OK';
  horizontal: 'IZQUIERDA' | 'DERECHA' | 'OK';
  vertical: 'ARRIBA' | 'ABAJO' | 'OK';
  cercaniaCentro: number;
}

export const TOLERANCIAS_ROSTRO: ToleranciasRostro = {
  anchoMinimoRelativo: 0.17,
  anchoMaximoRelativo: 0.55,
  toleranciaHorizontalRelativa: 0.13,
  toleranciaVerticalRelativa: 0.16,
};

function limitarEntreCeroYUno(valor: number): number {
  return Math.min(1, Math.max(0, valor));
}

export function analizarPosicionRostro(
  caja: CajaRostro,
  frame: TamañoFrame,
  tolerancias: Partial<ToleranciasRostro> = {},
): PosicionRostro {
  if (
    !Number.isFinite(caja.x) ||
    !Number.isFinite(caja.y) ||
    !Number.isFinite(caja.width) ||
    !Number.isFinite(caja.height) ||
    caja.width <= 0 ||
    caja.height <= 0 ||
    !Number.isFinite(frame.width) ||
    !Number.isFinite(frame.height) ||
    frame.width <= 0 ||
    frame.height <= 0
  ) {
    throw new RangeError('La caja del rostro y el tamaño del frame deben ser válidos.');
  }

  const limites = { ...TOLERANCIAS_ROSTRO, ...tolerancias };
  const anchoRelativo = caja.width / frame.width;
  const distancia =
    anchoRelativo < limites.anchoMinimoRelativo
      ? 'MUY_LEJOS'
      : anchoRelativo > limites.anchoMaximoRelativo
        ? 'MUY_CERCA'
        : 'OK';

  const centroRostroX = caja.x + caja.width / 2;
  const centroRostroY = caja.y + caja.height / 2;
  const desplazamientoX = centroRostroX - frame.width / 2;
  const desplazamientoY = centroRostroY - frame.height / 2;

  // Las coordenadas frontales invierten izquierda/derecha respecto del movimiento
  // propio: corregimos aquí para guiar desde la perspectiva real del usuario.
  const horizontal =
    Math.abs(desplazamientoX) <= frame.width * limites.toleranciaHorizontalRelativa
      ? 'OK'
      : desplazamientoX > 0
        ? 'IZQUIERDA'
        : 'DERECHA';

  const vertical =
    Math.abs(desplazamientoY) <= frame.height * limites.toleranciaVerticalRelativa
      ? 'OK'
      : desplazamientoY > 0
        ? 'ARRIBA'
        : 'ABAJO';

  const distanciaAlCentro = Math.hypot(desplazamientoX, desplazamientoY);
  const distanciaMaxima = Math.hypot(frame.width / 2, frame.height / 2);

  return {
    distancia,
    horizontal,
    vertical,
    cercaniaCentro: limitarEntreCeroYUno(1 - distanciaAlCentro / distanciaMaxima),
  };
}
