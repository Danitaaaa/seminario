import { useEffect } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Boton } from '../comunes/boton';
import type { SesionEstudio } from '../../types/sesionesEstudio';
import { formatearDiaHora } from '../../pages/sesionesEstudio/utilidades';

interface ModalSuperposicionProps {
  // Sesiones cuyo horario se cruza con el elegido.
  superpuestas: SesionEstudio[];
  // Texto del botón que sigue adelante ("Crear igual", "Guardar igual").
  textoContinuar: string;
  onContinuar: () => void;
  onCambiar: () => void;
}

// Hora de fin de una sesión (inicio + duración), "15:30".
function horaFin(sesion: SesionEstudio): string {
  const fin = new Date(new Date(sesion.fechaProgramada).getTime() + sesion.duracion * 60_000);
  return fin.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// Cartel de advertencia: el horario elegido se cruza con otras sesiones.
// No impide nada: el usuario puede volver a cambiar el horario o seguir igual.
export function ModalSuperposicion({ superpuestas, textoContinuar, onContinuar, onCambiar }: ModalSuperposicionProps) {
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => e.key === 'Escape' && onCambiar();
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [onCambiar]);

  const una = superpuestas.length === 1;
  return (
    <div className="sesiones__overlay" onClick={onCambiar}>
      <div
        className="sesiones__modal superposicion"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="superposicion-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="superposicion__cabecera">
          <span className="superposicion__icono" aria-hidden="true"><TriangleAlert size={20} /></span>
          <h3 id="superposicion-titulo" className="sesiones__modal-titulo">Ese horario ya está ocupado</h3>
        </div>
        <p className="sesiones__modal-texto">
          {una ? 'Se superpone con esta sesión:' : `Se superpone con ${superpuestas.length} sesiones:`}
        </p>
        <ul className="superposicion__lista">
          {superpuestas.map((s) => (
            <li key={s.idSesion} className="superposicion__item">
              <span className="superposicion__nombre">{s.nombre}</span>
              <span className="superposicion__detalle">
                {s.materiaAsociada.nombre} · {formatearDiaHora(s.fechaProgramada)} a {horaFin(s)} hs
              </span>
            </li>
          ))}
        </ul>
        <p className="sesiones__modal-texto">Podés guardarla igual o volver y elegir otro horario.</p>
        <div className="sesiones__modal-acciones">
          <Boton variante="contorno" onClick={onCambiar} autoFocus>Cambiar horario</Boton>
          <Boton onClick={onContinuar}>{textoContinuar}</Boton>
        </div>
      </div>
    </div>
  );
}