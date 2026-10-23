import type { EstadoSesionEstudio } from '../../types/sesionesEstudio';
import { ETIQUETA_ESTADO } from '../../pages/sesionesEstudio/utilidades';

interface EstadoBadgeProps {
  estado: EstadoSesionEstudio;
}

// Etiqueta con el estado de la sesión (Sin empezar, En curso, Atrasada, Completada).
export function EstadoBadge({ estado }: EstadoBadgeProps) {
  return <span className={`sesiones__estado sesiones__estado--${estado}`}>{ETIQUETA_ESTADO[estado]}</span>;
}
