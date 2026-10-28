import { useEffect, useState } from 'react';
import { TextoConFormulas } from '../comunes/textoConFormulas';
import type { Deck, Flashcard } from '../../types/flashcards';

type Dificultad = 'dificil' | 'intermedio' | 'facil';

interface PanelFlashcardsProps {
  usuarioId: number;
  idDeck: number;
  onCambiarMazo: () => void;
}

// Repaso del mazo de la sesión sin salir de ella: pregunta, respuesta y cómo te resultó.
// Cada respuesta se registra en la repetición espaciada, igual que en la pantalla de Flashcards.
export function PanelFlashcards({ usuarioId, idDeck, onCambiarMazo }: PanelFlashcardsProps) {
  const [mazo, setMazo] = useState<Deck | null>(null);
  const [tarjetas, setTarjetas] = useState<Flashcard[]>([]);
  const [indice, setIndice] = useState(0);
  const [volteada, setVolteada] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setCargando(true);
    setError('');
    Promise.all([window.api.listarDecks(usuarioId), window.api.listarFlashcards({ usuarioId, deckId: idDeck })])
      .then(([mazos, listado]) => {
        setMazo(mazos.find((m) => m.idDeck === idDeck) ?? null);
        setTarjetas(listado);
        setIndice(0);
        setVolteada(false);
      })
      .catch(() => setError('No se pudo cargar el mazo.'))
      .finally(() => setCargando(false));
  }, [usuarioId, idDeck]);

  async function evaluar(dificultad: Dificultad) {
    const actual = tarjetas[indice];
    if (!actual) return;
    setGuardando(true);
    setError('');
    try {
      await window.api.registrarRevision({ usuarioId, flashcardId: actual.idFlashcard, dificultad });
      setVolteada(false);
      setIndice((i) => i + 1);
    } catch {
      setError('No se pudo guardar el repaso.');
    } finally {
      setGuardando(false);
    }
  }

  // Pasa a la siguiente sin registrar el repaso.
  function saltar() {
    setVolteada(false);
    setIndice((i) => i + 1);
  }

  const cambiar = (
    <button type="button" className="flash-sesion__saltar" onClick={onCambiarMazo}>
      Cambiar mazo
    </button>
  );

  if (cargando) return <p className="sesion__nota">Cargando mazo…</p>;
  if (!mazo) return <div className="flash-sesion"><p className="sesion__nota">El mazo de esta sesión ya no existe.</p>{cambiar}</div>;
  if (tarjetas.length === 0) {
    return <div className="flash-sesion"><p className="sesion__nota">"{mazo.nombre}" todavía no tiene tarjetas.</p>{cambiar}</div>;
  }

  const actual = tarjetas[indice];

  if (!actual) {
    return (
      <div className="flash-sesion">
        <p className="flash-sesion__fin">¡Terminaste el mazo "{mazo.nombre}"!</p>
        <button type="button" className="flash-sesion__accion" onClick={() => setIndice(0)}>
          Repasar de nuevo
        </button>
        {cambiar}
      </div>
    );
  }

  return (
    <div className="flash-sesion">
      <p className="flash-sesion__mazo">
        {mazo.nombre} · {indice + 1} de {tarjetas.length}
      </p>
      <span className="flash-sesion__barra" aria-hidden="true">
        <span style={{ width: `${(indice / tarjetas.length) * 100}%` }} />
      </span>

      {/* Tocar la tarjeta la da vuelta: de la pregunta a la respuesta y al revés. */}
      <button
        type="button"
        className={`flash-sesion__tarjeta${volteada ? ' flash-sesion__tarjeta--respuesta' : ''}`}
        onClick={() => setVolteada((v) => !v)}
        aria-label={volteada ? 'Volver a la pregunta' : 'Ver la respuesta'}
      >
        <small>{volteada ? 'Respuesta' : 'Pregunta'}</small>
        <span className="flash-sesion__texto" aria-live="polite">
          <TextoConFormulas texto={volteada ? actual.respuesta : actual.pregunta} />
        </span>
        {!volteada && <span className="flash-sesion__pista">Tocá la tarjeta para ver la respuesta</span>}
      </button>

      {error && <p className="flash-sesion__error">{error}</p>}

      {volteada && (
        <div className="flash-sesion__dificultades" role="group" aria-label="¿Cómo te resultó?">
          <button type="button" disabled={guardando} onClick={() => void evaluar('dificil')}>Difícil</button>
          <button type="button" disabled={guardando} onClick={() => void evaluar('intermedio')}>Intermedio</button>
          <button type="button" disabled={guardando} onClick={() => void evaluar('facil')}>Fácil</button>
        </div>
      )}
      <div className="flash-sesion__pie">
        <button type="button" className="flash-sesion__saltar" disabled={guardando} onClick={saltar}>
          Saltar
        </button>
        {cambiar}
      </div>
    </div>
  );
}
