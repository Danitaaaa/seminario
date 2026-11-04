import { useEffect, useRef, useState } from 'react';
import { FilePlus, FolderOpen, Plus } from 'lucide-react';

interface MenuAgregarPestanaProps {
  onCrearPestana: () => void;
  onAbrirArchivo: () => void;
}

// Botón "+" de la barra de pestañas. Al tocarlo despliega dos opciones:
// crear una pestaña nueva o abrir un archivo de Material sin salir de la sesión.
// Se cierra al elegir una opción, al hacer clic afuera o con Escape.
export function MenuAgregarPestana({ onCrearPestana, onAbrirArchivo }: MenuAgregarPestanaProps) {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const alHacerClic = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    };
    const alPresionar = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false);
    document.addEventListener('mousedown', alHacerClic);
    document.addEventListener('keydown', alPresionar);
    return () => {
      document.removeEventListener('mousedown', alHacerClic);
      document.removeEventListener('keydown', alPresionar);
    };
  }, [abierto]);

  // Cierra el menú y ejecuta la opción elegida.
  const elegir = (accion: () => void) => () => {
    setAbierto(false);
    accion();
  };

  return (
    <div className="menu-pestana" ref={contenedor}>
      <button
        type="button"
        className={`pestanas-sesion__agregar${abierto ? ' pestanas-sesion__agregar--abierto' : ''}`}
        aria-label="Agregar"
        title="Crear pestaña o abrir un archivo"
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
      >
        <Plus size={14} />
      </button>

      {abierto && (
        <div className="menu-pestana__lista" role="menu">
          <button type="button" role="menuitem" className="menu-pestana__opcion" onClick={elegir(onCrearPestana)}>
            <FilePlus size={18} aria-hidden="true" />
            <span>Crear pestaña</span>
          </button>
          <button type="button" role="menuitem" className="menu-pestana__opcion" onClick={elegir(onAbrirArchivo)}>
            <FolderOpen size={18} aria-hidden="true" />
            <span>Abrir archivo o carpeta</span>
          </button>
        </div>
      )}
    </div>
  );
}
