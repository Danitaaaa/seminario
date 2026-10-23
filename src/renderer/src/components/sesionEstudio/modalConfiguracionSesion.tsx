import { FormEvent, useState } from 'react';
import { Boton } from '../comunes/boton';
import type { SesionEstudio } from '../../types/sesionesEstudio';
import { aInputFechaHora, desdeInputFechaHora, extraerMensajeError } from '../../pages/sesionesEstudio/utilidades';

interface ModalConfiguracionSesionProps {
  sesion: SesionEstudio;
  onCancelar: () => void;
  onGuardar: (cambios: { nombre: string; fechaProgramada: string }) => Promise<void>;
}

// Modal "Configuraciones de sesión": permite cambiar el nombre y la fecha de programación.
export function ModalConfiguracionSesion({ sesion, onCancelar, onGuardar }: ModalConfiguracionSesionProps) {
  const [nombre, setNombre] = useState(sesion.nombre);
  const [fecha, setFecha] = useState(aInputFechaHora(sesion.fechaProgramada));
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Valida los campos y envía los cambios; muestra el error si falla.
  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (nombre.trim() === '' || fecha === '') {
      setError('Completá el nombre y la fecha.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await onGuardar({ nombre: nombre.trim(), fechaProgramada: desdeInputFechaHora(fecha) });
    } catch (e) {
      setError(extraerMensajeError(e, 'No se pudo guardar.'));
      setGuardando(false);
    }
  }

  return (
    <div className="sesiones__overlay">
      <form className="sesiones__modal" onSubmit={enviar}>
        <h3 className="sesiones__modal-titulo">Configuraciones de sesión</h3>

        <label className="sesiones__campo">
          Nombre
          <input value={nombre} maxLength={100} onChange={(e) => setNombre(e.target.value)} />
        </label>

        <label className="sesiones__campo">
          Fecha de programación
          <input type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>

        {error && <div className="sesiones__error">{error}</div>}

        <div className="sesiones__modal-acciones">
          <Boton variante="contorno" onClick={onCancelar} disabled={guardando}>
            Cancelar
          </Boton>
          <Boton type="submit" disabled={guardando}>
            Guardar
          </Boton>
        </div>
      </form>
    </div>
  );
}
