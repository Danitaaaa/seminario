import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { Boton } from '../comunes/boton';

interface ModalAvisoPracticaActivaProps {
  duracion: number; // minutos planificados
  onEmpezar: (noVolverAMostrar: boolean) => void;
  onCancelar: () => void;
}

// Se muestra antes de iniciar una sesión con Práctica activa (salvo que se haya tildado "No volver a mostrar").
export function ModalAvisoPracticaActiva({ duracion, onEmpezar, onCancelar }: ModalAvisoPracticaActivaProps) {
  const [noVolverAMostrar, setNoVolverAMostrar] = useState(false);

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => e.key === 'Escape' && onCancelar();
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [onCancelar]);

  return (
    <div className="sesiones__overlay" onClick={onCancelar}>
      <div
        className="sesiones__modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="practica-activa-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="practica-activa__icono" aria-hidden="true"><Lock size={22} /></span>
        <h3 className="sesiones__modal-titulo" id="practica-activa-titulo">Sesión de Práctica activa</h3>
        <p className="sesiones__modal-texto">
          Una vez que la inicies, <strong>no vas a poder salir hasta completar los {duracion} minutos</strong>:
          no se puede ir a otra pantalla, cerrar sesión, cerrar la app ni finalizarla antes.
        </p>
        <p className="sesiones__modal-texto">Si la pausás, el tiempo no avanza hasta que la reanudes.</p>
        <label className="practica-activa__no-mostrar">
          <input type="checkbox" checked={noVolverAMostrar} onChange={(e) => setNoVolverAMostrar(e.target.checked)} />
          No volver a mostrar
        </label>
        <div className="sesiones__modal-acciones">
          <Boton variante="contorno" onClick={onCancelar}>Cancelar</Boton>
          <Boton onClick={() => onEmpezar(noVolverAMostrar)} autoFocus>Empezar</Boton>
        </div>
      </div>
    </div>
  );
}
