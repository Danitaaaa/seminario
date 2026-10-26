import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

// Flechas para ir a la pantalla anterior o siguiente, como en un navegador.
export function FlechasNavegacion() {
  const navigate = useNavigate();
  useLocation(); // vuelve a dibujar al cambiar de pantalla para actualizar el estado de las flechas

  const indice: number = window.history.state?.idx ?? 0;
  const puedeVolver = indice > 0;
  const puedeAvanzar = indice < window.history.length - 1;

  return (
    <div className="app-flechas">
      <button type="button" className="app-flecha" aria-label="Volver" title="Volver" disabled={!puedeVolver} onClick={() => navigate(-1)}>
        <ChevronLeft size={16} />
      </button>
      <button type="button" className="app-flecha" aria-label="Avanzar" title="Avanzar" disabled={!puedeAvanzar} onClick={() => navigate(1)}>
        <ChevronRight size={16} />
      </button>
    </div>
  );
}