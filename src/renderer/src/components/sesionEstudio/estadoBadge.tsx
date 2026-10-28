import type { EstadoSesionEstudio } from '../../types/sesionesEstudio';
import { ETIQUETA_ESTADO } from '../../pages/sesionesEstudio/utilidades';

interface EstadoBadgeProps {
  estado: EstadoSesionEstudio;
  // Una sesión pausada sigue "en curso" pero se muestra como "Pausada".
  pausada?: boolean;
}

// Etiqueta con el estado de la sesión (Sin empezar, En curso, Pausada, Atrasada, Completada).
export function EstadoBadge({ estado, pausada = false }: EstadoBadgeProps) {
  if (pausada) return <span className="sesiones__estado sesiones__estado--pausada">Pausada</span>;
  return <span className={`sesiones__estado sesiones__estado--${estado}`}>{ETIQUETA_ESTADO[estado]}</span>;
}
