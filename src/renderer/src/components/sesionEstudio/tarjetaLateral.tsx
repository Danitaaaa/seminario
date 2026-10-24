import type { ReactNode } from 'react';
import { usarPreferencia } from '../../hooks/usarPreferencia';

interface TarjetaLateralProps {
  titulo: string;
  // Clave para recordar si el usuario la dejó colapsada.
  id: string;
  children: ReactNode;
}

// Tarjeta del panel derecho de la sesión (Pomodoro, Spotify, Objetivos, Próxima sesión...).
// El triángulo de la derecha la colapsa o expande, y la app recuerda la elección.
export function TarjetaLateral({ titulo, id, children }: TarjetaLateralProps) {
  const [colapsada, setColapsada] = usarPreferencia(`sesion-tarjeta-${id}`, false);
  const idCuerpo = `tarjeta-${id}`;

  return (
    <section className={`tarjeta-lateral${colapsada ? ' tarjeta-lateral--colapsada' : ''}`}>
      <header className="tarjeta-lateral__encabezado">
        <h4 className="tarjeta-lateral__titulo">{titulo}</h4>
        <button
          type="button"
          className="tarjeta-lateral__alternar"
          aria-expanded={!colapsada}
          aria-controls={idCuerpo}
          aria-label={colapsada ? `Mostrar ${titulo}` : `Ocultar ${titulo}`}
          title={colapsada ? 'Mostrar' : 'Ocultar'}
          onClick={() => setColapsada((c) => !c)}
        >
          <svg width="12" height="10" viewBox="0 0 12 10" aria-hidden="true">
            <path d="M6 0 L12 10 L0 10 Z" fill="currentColor" />
          </svg>
        </button>
      </header>
      {!colapsada && (
        <div className="tarjeta-lateral__cuerpo" id={idCuerpo}>
          {children}
        </div>
      )}
    </section>
  );
}
