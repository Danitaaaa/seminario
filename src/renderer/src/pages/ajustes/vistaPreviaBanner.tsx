import { Crosshair, Move } from "lucide-react";
import type { PosicionBanner } from "../../hooks/usarPreferenciaBanner";
import { usarArrastreImagen } from "../../hooks/usarArrastreImagen";

interface Props {
  imagen: string;
  nombre: string;
  posicion: PosicionBanner;
  alCambiar: (posicion: PosicionBanner) => void;
}

// Vista previa del banner de inicio con la imagen elegida.
// Arrastrando la imagen (o con las flechas del teclado) se elige qué parte se ve.
export function VistaPreviaBanner({ imagen, nombre, posicion, alCambiar }: Props) {
  const { ref, actual, arrastrando, eventos } = usarArrastreImagen<HTMLDivElement>(imagen, posicion, alCambiar);

  return (
    <div className="vista-banner">
      <div
        ref={ref}
        className={`vista-banner__caja${arrastrando ? " vista-banner__caja--arrastrando" : ""}`}
        style={{ backgroundImage: `url("${imagen}")`, backgroundPosition: `${actual.x}% ${actual.y}%` }}
        role="slider"
        tabIndex={0}
        aria-label="Posición de la imagen del banner. Usá las flechas para moverla."
        aria-valuetext={`${Math.round(actual.x)}% horizontal, ${Math.round(actual.y)}% vertical`}
        {...eventos}
      >
        <span className="vista-banner__saludo">¡Hola{nombre ? `, ${nombre}` : ""}!</span>
        <span className="vista-banner__pista">
          <Move size={14} aria-hidden="true" />
          Arrastrá para acomodar la imagen
        </span>
      </div>
      <button type="button" className="ajustes__boton" onClick={() => alCambiar({ x: 50, y: 50 })}>
        <Crosshair size={16} aria-hidden="true" />
        Centrar
      </button>
    </div>
  );
}