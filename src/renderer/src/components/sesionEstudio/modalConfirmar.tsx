import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Boton } from '../comunes/boton';

interface ModalConfirmarProps {
  titulo: string;
  mensaje: ReactNode;
  textoConfirmar?: string;
  peligro?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

// Confirmación genérica del módulo (eliminar sesión, eliminar pestaña...). Escape cancela.
export function ModalConfirmar({
  titulo,
  mensaje,
  textoConfirmar = 'Eliminar',
  peligro = true,
  onConfirmar,
  onCancelar,
}: ModalConfirmarProps) {
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => e.key === 'Escape' && onCancelar();
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [onCancelar]);

  return (
    <div className="sesiones__overlay" onClick={onCancelar}>
      <div className="sesiones__modal" role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <h3 className="sesiones__modal-titulo">{titulo}</h3>
        <p className="sesiones__modal-texto">{mensaje}</p>
        <div className="sesiones__modal-acciones">
          <Boton variante="contorno" onClick={onCancelar}>Cancelar</Boton>
          <Boton className={peligro ? 'app-boton--peligro' : ''} onClick={onConfirmar} autoFocus>
            {textoConfirmar}
          </Boton>
        </div>
      </div>
    </div>
  );
}
