import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as EventoPuntero, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/react';
import { AlignCenter, AlignLeft, AlignRight, Crop, Maximize2 } from 'lucide-react';
import { Boton } from './boton';
import type { Alineacion } from './imagenesEditor';

interface HerramientasImagenProps {
  editor: Editor;
  // Cómo dibuja cada barra sus botones (la de la sesión usa íconos; la del visor, texto).
  boton: (etiqueta: string, icono: ReactNode, activo: boolean, accion: () => void) => ReactNode;
}

// Botones que aparecen en la barra cuando hay una imagen seleccionada.
export function HerramientasImagen({ editor, boton }: HerramientasImagenProps) {
  const [recortando, setRecortando] = useState<string | null>(null);
  if (!editor.isActive('image')) return null;

  const atributos = editor.getAttributes('image');
  const alinear = (atributos.alinear ?? 'izquierda') as Alineacion;
  const cambiar = (cambios: Record<string, unknown>) => editor.chain().focus().updateAttributes('image', cambios).run();


  return (
    <>
      {boton('Recortar imagen', <Crop size={15} />, false, () => setRecortando(atributos.src as string))}
      {boton('Imagen a la izquierda', <AlignLeft size={15} />, alinear === 'izquierda', () => cambiar({ alinear: 'izquierda' }))}
      {boton('Imagen al centro', <AlignCenter size={15} />, alinear === 'centro', () => cambiar({ alinear: 'centro' }))}
      {boton('Imagen a la derecha', <AlignRight size={15} />, alinear === 'derecha', () => cambiar({ alinear: 'derecha' }))}
      {boton('Tamaño original', <Maximize2 size={15} />, false, () => cambiar({ width: null, height: null }))}

      {recortando && createPortal(
        <ModalRecortar
          src={recortando}
          onAplicar={(src, ancho, alto) => {
            // Si la imagen tenía un ancho elegido se mantiene; el alto sigue la proporción del recorte.
            const anchoActual = Number(atributos.width) || null;
            cambiar({ src, width: anchoActual, height: anchoActual ? Math.round((anchoActual * alto) / ancho) : null });
            setRecortando(null);
          }}
          onCancelar={() => setRecortando(null)}
        />,
        document.body,
      )}
    </>
  );
}

interface Rectangulo { x: number; y: number; ancho: number; alto: number }

interface ModalRecortarProps {
  src: string;
  onAplicar: (src: string, ancho: number, alto: number) => void;
  onCancelar: () => void;
}

// Se arrastra sobre la imagen para marcar la parte que queda. Escape cancela.
function ModalRecortar({ src, onAplicar, onCancelar }: ModalRecortarProps) {
  const imagen = useRef<HTMLImageElement>(null);
  const inicio = useRef<{ x: number; y: number } | null>(null);
  const [zona, setZona] = useState<Rectangulo | null>(null);

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => e.key === 'Escape' && onCancelar();
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [onCancelar]);

  // Posición del puntero dentro de la imagen, sin salirse de sus bordes.
  function punto(e: EventoPuntero) {
    const caja = imagen.current!.getBoundingClientRect();
    return {
      x: Math.min(Math.max(e.clientX - caja.left, 0), caja.width),
      y: Math.min(Math.max(e.clientY - caja.top, 0), caja.height),
    };
  }

  function empezar(e: EventoPuntero<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    inicio.current = punto(e);
    setZona(null);
  }

  function mover(e: EventoPuntero) {
    if (!inicio.current) return;
    const actual = punto(e);
    setZona({
      x: Math.min(inicio.current.x, actual.x),
      y: Math.min(inicio.current.y, actual.y),
      ancho: Math.abs(actual.x - inicio.current.x),
      alto: Math.abs(actual.y - inicio.current.y),
    });
  }

  function aplicar() {
    const img = imagen.current;
    if (!img || !zona) return;
    // La zona está en píxeles de pantalla: se pasa a los píxeles reales de la imagen.
    const escala = img.naturalWidth / img.getBoundingClientRect().width;
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(zona.ancho * escala);
    lienzo.height = Math.round(zona.alto * escala);
    lienzo.getContext('2d')!.drawImage(
      img,
      zona.x * escala, zona.y * escala, zona.ancho * escala, zona.alto * escala,
      0, 0, lienzo.width, lienzo.height,
    );
    const recorte = src.startsWith('data:image/png') ? lienzo.toDataURL('image/png') : lienzo.toDataURL('image/jpeg', 0.9);
    onAplicar(recorte, lienzo.width, lienzo.height);
  }

  const valida = zona !== null && zona.ancho > 8 && zona.alto > 8;

  return (
    <div className="recorte__fondo" onClick={onCancelar}>
      <div className="recorte__ventana" role="dialog" aria-modal="true" aria-label="Recortar imagen" onClick={(e) => e.stopPropagation()}>
        <h3 className="recorte__titulo">Recortar imagen</h3>
        <p className="recorte__ayuda">Arrastrá sobre la imagen para marcar la parte que querés dejar.</p>
        <div className="recorte__area" onPointerDown={empezar} onPointerMove={mover} onPointerUp={() => (inicio.current = null)}>
          <img ref={imagen} src={src} alt="" draggable={false} className="recorte__imagen" />
          {zona && (
            <div
              className="recorte__zona"
              style={{ left: zona.x, top: zona.y, width: zona.ancho, height: zona.alto }}
            />
          )}
        </div>
        <div className="recorte__acciones">
          <Boton variante="contorno" onClick={onCancelar}>Cancelar</Boton>
          <Boton onClick={aplicar} disabled={!valida}>Recortar</Boton>
        </div>
      </div>
    </div>
  );
}
