import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usarPreferencia } from '../../hooks/usarPreferencia';
import { claseDeMetodo, type ClaseMetodo } from '../../utils/metodosEstudio';
import { TextoConFormulas } from '../comunes/textoConFormulas';
import type { SesionEstudio } from '../../types/sesionesEstudio';
import type { FlashcardPendiente, RepeticionMaterial } from '../../types/flashcards';
import { PanelFlashcards } from './panelFlashcards';
import { ElegirMazo } from './elegirMazo';

interface PanelMetodosProps {
  sesion: SesionEstudio;
  usuarioId: number;
  // Guarda el mazo de la sesión (o lo quita con null).
  onCambiarMazo: (idDeck: number | null) => Promise<void>;
}

// Recuadro "Métodos de estudio" de la sesión. Muestra el método elegido (repasar el mazo,
// los repasos pendientes o una guía). Con dos o más métodos, una mini lista arriba elige cuál se ve.
export function PanelMetodos({ sesion, usuarioId, onCambiarMazo }: PanelMetodosProps) {
  const metodos = sesion.metodosEstudio;
  const [elegido, setElegido] = usarPreferencia<number | null>(`sesion-${sesion.idSesion}-metodo`, null);
  const actual = metodos.find((m) => m.idTipoMetodoEstudio === elegido) ?? metodos[0];

  if (!actual) return <p className="sesion__nota">Esta sesión no tiene métodos de estudio asignados.</p>;

  return (
    <div className="metodos-sesion">
      {metodos.length > 1 && (
        <div className="metodos-sesion__lista" role="radiogroup" aria-label="Qué método mostrar">
          {metodos.map((m) => {
            const activo = m.idTipoMetodoEstudio === actual.idTipoMetodoEstudio;
            return (
              <button
                key={m.idTipoMetodoEstudio}
                type="button"
                role="radio"
                aria-checked={activo}
                className={`metodos-sesion__opcion${activo ? ' metodos-sesion__opcion--activa' : ''}`}
                onClick={() => setElegido(m.idTipoMetodoEstudio)}
              >
                {m.nombre}
              </button>
            );
          })}
        </div>
      )}
      {metodos.length === 1 && <p className="metodos-sesion__nombre">{actual.nombre}</p>}

      <ContenidoMetodo clase={claseDeMetodo(actual.nombre)} sesion={sesion} usuarioId={usuarioId} onCambiarMazo={onCambiarMazo} />
    </div>
  );
}

function ContenidoMetodo({ clase, sesion, usuarioId, onCambiarMazo }: { clase: ClaseMetodo } & PanelMetodosProps) {
  const [cambiandoMazo, setCambiandoMazo] = useState(false);

  if (clase === 'flashcards') {
    if (sesion.idDeck === null || cambiandoMazo) {
      return (
        <ElegirMazo
          usuarioId={usuarioId}
          idActual={sesion.idDeck}
          onElegir={async (idDeck) => {
            await onCambiarMazo(idDeck);
            setCambiandoMazo(false);
          }}
          onCancelar={sesion.idDeck !== null ? () => setCambiandoMazo(false) : undefined}
        />
      );
    }
    return <PanelFlashcards usuarioId={usuarioId} idDeck={sesion.idDeck} onCambiarMazo={() => setCambiandoMazo(true)} />;
  }
  if (clase === 'repeticiones') return <PanelRepasos usuarioId={usuarioId} />;
  return <GuiaMetodo clase={clase} />;
}

// Lo que toca repasar hoy según la repetición espaciada: tarjetas y material.
function PanelRepasos({ usuarioId }: { usuarioId: number }) {
  const [tarjetas, setTarjetas] = useState<FlashcardPendiente[] | null>(null);
  const [material, setMaterial] = useState<RepeticionMaterial[]>([]);

  useEffect(() => {
    Promise.all([window.api.listarFlashcardsPendientes(usuarioId), window.api.listarRepeticionesMaterial(usuarioId)])
      .then(([pendientes, programados]) => {
        setTarjetas(pendientes);
        const finDeHoy = new Date();
        finDeHoy.setHours(23, 59, 59, 999);
        setMaterial(programados.filter((m) => new Date(m.proximaRevision) <= finDeHoy));
      })
      .catch(() => setTarjetas([]));
  }, [usuarioId]);

  if (tarjetas === null) return <p className="sesion__nota">Buscando repasos…</p>;
  if (tarjetas.length === 0 && material.length === 0) {
    return <p className="sesion__nota">Hoy no tenés repasos pendientes. ¡Vas al día!</p>;
  }

  return (
    <div className="metodos-sesion__repasos">
      {tarjetas.length > 0 && (
        <div>
          <p className="metodos-sesion__subtitulo">{tarjetas.length} {tarjetas.length === 1 ? 'tarjeta para repasar' : 'tarjetas para repasar'}</p>
          <ul>
            {tarjetas.slice(0, 3).map((t) => (
              <li key={t.idFlashcard}>
                <TextoConFormulas texto={t.pregunta} /> <small>· {t.nombreDeck}</small>
              </li>
            ))}
          </ul>
        </div>
      )}
      {material.length > 0 && (
        <div>
          <p className="metodos-sesion__subtitulo">{material.length} {material.length === 1 ? 'material para releer' : 'materiales para releer'}</p>
          <ul>
            {material.slice(0, 3).map((m) => <li key={m.nodoId}>{m.nombre}</li>)}
          </ul>
        </div>
      )}
      <Link className="metodos-sesion__enlace" to="/repeticion-espaciada">Ir a Repetición espaciada →</Link>
    </div>
  );
}

const GUIAS: Record<Exclude<ClaseMetodo, 'flashcards' | 'repeticiones'>, string[]> = {
  'mapa-mental': [
    'Escribí el tema central en el medio de una pestaña nueva.',
    'Sacá ramas con las ideas principales y, de cada una, los detalles.',
    'Uní con flechas lo que se relaciona y repasalo al final de la sesión.',
  ],
  'practica-activa': [
    'Cerrá el apunte y explicá el tema con tus palabras en una pestaña.',
    'Resolvé ejercicios sin mirar la resolución.',
    'Compará con el material y anotá en qué te equivocaste.',
  ],
  otro: ['Seguí el método que elegiste para esta sesión y anotá lo que vas haciendo en el editor.'],
};

function GuiaMetodo({ clase }: { clase: Exclude<ClaseMetodo, 'flashcards' | 'repeticiones'> }) {
  const pasos = GUIAS[clase];
  return pasos.length > 1 ? (
    <ol className="metodos-sesion__guia">{pasos.map((p) => <li key={p}>{p}</li>)}</ol>
  ) : (
    <p className="sesion__nota">{pasos[0]}</p>
  );
}
