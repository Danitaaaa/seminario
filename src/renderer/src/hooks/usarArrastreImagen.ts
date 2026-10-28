import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

// Qué parte de la imagen se ve, en % (como background-position). 50/50 es el centro.
export interface PosicionImagen {
  x: number;
  y: number;
}

const PASO_TECLADO = 5;
const entre0y100 = (n: number) => Math.min(100, Math.max(0, n));

// Permite acomodar una imagen de fondo (background-size: cover) arrastrándola o con las flechas.
// Se usa en la vista previa del banner y en la portada de los proyectos.
export function usarArrastreImagen<T extends HTMLElement>(
  imagen: string,
  posicion: PosicionImagen,
  alCambiar: (posicion: PosicionImagen) => void,
) {
  const ref = useRef<T>(null);
  const [tamano, setTamano] = useState<{ ancho: number; alto: number } | null>(null);
  const [arrastre, setArrastre] = useState<{ x: number; y: number; desde: PosicionImagen } | null>(null);
  // Mientras se arrastra se muestra la posición nueva; se guarda al soltar.
  const [provisoria, setProvisoria] = useState<PosicionImagen | null>(null);
  const actual = provisoria ?? posicion;

  // Tamaño real de la imagen: hace falta para saber cuánto sobra a los costados con "cover".
  useEffect(() => {
    if (!imagen) return;
    const img = new Image();
    img.onload = () => setTamano({ ancho: img.naturalWidth, alto: img.naturalHeight });
    img.src = imagen;
  }, [imagen]);

  // Cuántos píxeles de imagen quedan fuera de la caja en cada eje.
  function sobrante(): { x: number; y: number } {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || !tamano) return { x: 0, y: 0 };
    const escala = Math.max(rect.width / tamano.ancho, rect.height / tamano.alto);
    return { x: tamano.ancho * escala - rect.width, y: tamano.alto * escala - rect.height };
  }

  function onPointerDown(e: PointerEvent<T>): void {
    e.currentTarget.setPointerCapture(e.pointerId);
    setArrastre({ x: e.clientX, y: e.clientY, desde: posicion });
  }

  function onPointerMove(e: PointerEvent<T>): void {
    if (!arrastre) return;
    const resto = sobrante();
    // Mover el mouse a la derecha corre la foto a la derecha: se ve más de su lado izquierdo.
    const x = resto.x > 0 ? arrastre.desde.x - ((e.clientX - arrastre.x) / resto.x) * 100 : arrastre.desde.x;
    const y = resto.y > 0 ? arrastre.desde.y - ((e.clientY - arrastre.y) / resto.y) * 100 : arrastre.desde.y;
    setProvisoria({ x: entre0y100(x), y: entre0y100(y) });
  }

  function onPointerUp(): void {
    if (provisoria) alCambiar(provisoria);
    setArrastre(null);
    setProvisoria(null);
  }

  function onKeyDown(e: KeyboardEvent<T>): void {
    const pasos: Record<string, [number, number]> = {
      ArrowLeft: [PASO_TECLADO, 0],
      ArrowRight: [-PASO_TECLADO, 0],
      ArrowUp: [0, PASO_TECLADO],
      ArrowDown: [0, -PASO_TECLADO],
    };
    const paso = pasos[e.key];
    if (!paso) return;
    e.preventDefault();
    alCambiar({ x: entre0y100(posicion.x + paso[0]), y: entre0y100(posicion.y + paso[1]) });
  }

  return {
    ref,
    actual,
    arrastrando: arrastre !== null,
    eventos: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onKeyDown },
  };
}