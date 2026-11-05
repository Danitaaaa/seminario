import { EstadoNota } from './entidades';

// Estado que corresponde a una nota cuando el usuario no lo elige a mano.
// De 4 a 6 queda sin definir: depende de la universidad si eso aprueba.
export function estadoPorNota(nota: number | null): EstadoNota {
  if (nota === null) return 'pendiente';
  if (nota >= 7) return 'aprobado';
  if (nota < 4) return 'desaprobado';
  return 'sin_definir';
}
