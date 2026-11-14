import type { PosicionRostro } from './FacePositionAnalyzer';

export interface EstadoAvisoGuia {
  clave: string | null;
  ultimoAviso: number | null;
}

export interface ResultadoAvisoGuia {
  mensaje: string | null;
  siguienteEstado: EstadoAvisoGuia;
}

export const INTERVALO_RECORDATORIO_MS = 2500;

function obtenerMensajeYClave(posicion: PosicionRostro | null): [string, string | null] {
  if (!posicion) return ['sin-rostro', 'No te veo'];
  if (posicion.distancia === 'MUY_LEJOS') return ['distancia-lejos', 'Acercate'];
  if (posicion.distancia === 'MUY_CERCA') return ['distancia-cerca', 'Alejate'];
  if (posicion.horizontal === 'IZQUIERDA') {
    return ['horizontal-izquierda', 'Movete hacia la izquierda'];
  }
  if (posicion.horizontal === 'DERECHA') {
    return ['horizontal-derecha', 'Movete hacia la derecha'];
  }
  if (posicion.vertical === 'ARRIBA') return ['vertical-arriba', 'Subí un poco'];
  if (posicion.vertical === 'ABAJO') return ['vertical-abajo', 'Bajá un poco'];
  return ['centrado', ''];
}

export function obtenerAvisoGuia(
  posicion: PosicionRostro | null,
  estadoAnterior: EstadoAvisoGuia,
  ahora: number,
  intervaloMs = INTERVALO_RECORDATORIO_MS,
): ResultadoAvisoGuia {
  const [clave, mensaje] = obtenerMensajeYClave(posicion);
  const cambioEstado = clave !== estadoAnterior.clave;
  const recordar =
    estadoAnterior.ultimoAviso === null ||
    ahora - estadoAnterior.ultimoAviso >= intervaloMs;

  if (!mensaje) {
    return {
      mensaje: null,
      siguienteEstado: { clave, ultimoAviso: ahora },
    };
  }

  if (!cambioEstado && !recordar) {
    return { mensaje: null, siguienteEstado: estadoAnterior };
  }

  return {
    mensaje,
    siguienteEstado: { clave, ultimoAviso: ahora },
  };
}
