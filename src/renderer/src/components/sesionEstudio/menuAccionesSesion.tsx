import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';
import iconoMore from '../../assets/icons/more.svg';
import { IconoAccion } from '../comunes/iconoAccion';

interface MenuAccionesSesionProps {
  onAbrir: () => void;
  onConfigurar: () => void;
  onEliminar: () => void;
}

// Menú de tres puntos de cada sesión (fila o tarjeta): Abrir, Configuraciones y Eliminar.
// Se cierra al hacer clic afuera.
export function MenuAccionesSesion({ onAbrir, onConfigurar, onEliminar }: MenuAccionesSesionProps) {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const alClic = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', alClic);
    return () => document.removeEventListener('mousedown', alClic);
  }, [abierto]);

  const opcion = (accion: () => void) => () => {
    setAbierto(false);
    accion();
  };

  return (
    <div
      className="fila-nodo__menu-contenedor"
      ref={contenedor}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <IconoAccion icono={iconoMore} alt="Más acciones" onClick={() => setAbierto((v) => !v)} />
      {abierto && (
        <div className="menu-acciones-nodo" role="menu">
          <button type="button" className="menu-acciones-nodo__opcion" onClick={opcion(onAbrir)}>
            <ExternalLink size={16} /> <span>Abrir</span>
          </button>
          <button type="button" className="menu-acciones-nodo__opcion" onClick={opcion(onConfigurar)}>
            <Pencil size={16} /> <span>Configuraciones</span>
          </button>
          <button type="button" className="menu-acciones-nodo__opcion menu-acciones-nodo__opcion--peligro" onClick={opcion(onEliminar)}>
            <Trash2 size={16} /> <span>Eliminar sesión</span>
          </button>
        </div>
      )}
    </div>
  );
}
