// Práctica activa: una vez iniciada la sesión, no se puede salir hasta cumplir la duración planificada
// (ni navegar a otra pantalla, ni cerrar sesión, ni cerrar la app, ni finalizarla antes).
// El método se reconoce por el nombre, igual que en renderer/src/utils/metodosEstudio.ts.

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function tienePracticaActiva(metodos: ReadonlyArray<{ nombre: string }>): boolean {
  return metodos.some((m) => normalizar(m.nombre).includes('practica'));
}

export const MENSAJE_SALIDA_BLOQUEADA =
  'La sesión usa Práctica activa: no podés salir hasta completar el tiempo planificado.';

// Canal por el que el main avisa al renderer que se intentó cerrar la app durante la sesión.
export const CANAL_SALIDA_BLOQUEADA = 'sesionEstudio:salidaBloqueada';
