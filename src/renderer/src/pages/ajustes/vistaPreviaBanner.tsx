import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Crosshair, Move } from "lucide-react";
import type { PosicionBanner } from "../../hooks/usarPreferenciaBanner";

interface Props {
  imagen: string;
  nombre: string;
  posicion: PosicionBanner;
  alCambiar: (posicion: PosicionBanner) => void;
}

const PASO_TECLADO = 5;

// Vista previa del banner de inicio con la imagen elegida.
// Arrastrando la imagen (o con las flechas del teclado) se elige qué parte se ve.
export function VistaPreviaBanner({ imagen, nombre, posicion, alCambiar }: Props) {
  const caja = useRef<HTMLDivElement>(null);
  const [tamano, setTamano] = useState<{ ancho: number; alto: number } | null>(null);
  const [arrastre, setArrastre] = useState<{ x: number; y: number; desde: PosicionBanner } | null>(null);
  // Mientras se arrastra se muestra la posición nueva; se guarda al soltar.
  const [provisoria, setProvisoria] = useState<PosicionBanner | null>(null);
  const actual = provisoria ?? posicion;

  // Tamaño real de la imagen: hace falta para saber cuánto sobra a los costados con "cover".
  useEffect(() => {
    const img = new Image();
    img.onload = () => setTamano({ ancho: img.naturalWidth, alto: img.naturalHeight });
    img.src = imagen;
  }, [imagen]);

  // Cuántos píxeles de imagen quedan fuera de la caja en cada eje.
  function sobrante(): { x: number; y: number } {
    const rect = caja.current?.getBoundingClientRect();
    if (!rect || !tamano) return { x: 0, y: 0 };
    const escala = Math.max(rect.width / tamano.ancho, rect.height / tamano.alto);
    return { x: tamano.ancho * escala - rect.width, y: tamano.alto * escala - rect.height };
  }

  function alApretar(e: PointerEvent<HTMLDivElement>): void {
    e.currentTarget.setPointerCapture(e.pointerId);
    setArrastre({ x: e.clientX, y: e.clientY, desde: posicion });
  }

  function alMover(e: PointerEvent<HTMLDivElement>): void {
    if (!arrastre) return;
    const resto = sobrante();
    // Mover el mouse a la derecha corre la foto a la derecha: se ve más de su lado izquierdo.
    const x = resto.x > 0 ? arrastre.desde.x - ((e.clientX - arrastre.x) / resto.x) * 100 : arrastre.desde.x;
    const y = resto.y > 0 ? arrastre.desde.y - ((e.clientY - arrastre.y) / resto.y) * 100 : arrastre.desde.y;
    setProvisoria({ x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) });
  }

  function alSoltar(): void {
    if (provisoria) alCambiar(provisoria);
    setArrastre(null);
    setProvisoria(null);
  }

  function alTeclear(e: KeyboardEvent<HTMLDivElement>): void {
    const pasos: Record<string, [number, number]> = {
      ArrowLeft: [PASO_TECLADO, 0],
      ArrowRight: [-PASO_TECLADO, 0],
      ArrowUp: [0, PASO_TECLADO],
      ArrowDown: [0, -PASO_TECLADO],
    };
    const paso = pasos[e.key];
    if (!paso) return;
    e.preventDefault();
    alCambiar({ x: posicion.x + paso[0], y: posicion.y + paso[1] });
  }

  return (
    <div className="vista-banner">
      <div
        ref={caja}
        className={`vista-banner__caja${arrastre ? " vista-banner__caja--arrastrando" : ""}`}
        style={{ backgroundImage: `url("${imagen}")`, backgroundPosition: `${actual.x}% ${actual.y}%` }}
        role="slider"
        tabIndex={0}
        aria-label="Posición de la imagen del banner. Usá las flechas para moverla."
        aria-valuetext={`${Math.round(actual.x)}% horizontal, ${Math.round(actual.y)}% vertical`}
        onPointerDown={alApretar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
        onKeyDown={alTeclear}
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