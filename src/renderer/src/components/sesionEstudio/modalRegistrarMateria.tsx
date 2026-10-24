import { FormEvent, useState } from 'react';
import { Boton } from '../comunes/boton';
import type { Materia } from '../../types/sesionesEstudio';
import { extraerMensajeError } from '../../pages/sesionesEstudio/utilidades';

interface ModalRegistrarMateriaProps {
  onCancelar: () => void;
  onRegistrada: (materia: Materia) => void;
}

// "Registrar materia +": alta rápida de una materia para poder usarla en las sesiones.
export function ModalRegistrarMateria({ onCancelar, onRegistrada }: ModalRegistrarMateriaProps) {
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (nombre.trim() === '') {
      setError('Escribí el nombre de la materia.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      onRegistrada(await window.api.registrarMateria({ nombre: nombre.trim() }));
    } catch (e) {
      setError(extraerMensajeError(e, 'No se pudo registrar la materia.'));
      setGuardando(false);
    }
  }

  return (
    <div className="sesiones__overlay" onClick={onCancelar}>
      <form
        className="sesiones__modal"
        role="dialog"
        aria-modal="true"
        aria-label="Registrar materia"
        onSubmit={enviar}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="sesiones__modal-titulo">Registrar materia</h3>
        <label className="sesiones__campo">
          Nombre de la materia
          <input
            autoFocus
            value={nombre}
            maxLength={100}
            placeholder="Ej.: Base de datos"
            onChange={(e) => setNombre(e.target.value)}
          />
        </label>
        {error && <div className="sesiones__error">{error}</div>}
        <div className="sesiones__modal-acciones">
          <Boton variante="contorno" onClick={onCancelar} disabled={guardando}>Cancelar</Boton>
          <Boton type="submit" disabled={guardando}>Registrar</Boton>
        </div>
      </form>
    </div>
  );
}
