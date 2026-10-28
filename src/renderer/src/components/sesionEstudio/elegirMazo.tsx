import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Deck } from '../../types/flashcards';

interface ElegirMazoProps {
  usuarioId: number;
  idActual: number | null;
  onElegir: (idDeck: number) => Promise<void>;
  onCancelar?: () => void;
}

// Para elegir qué mazo se repasa en la sesión (si no se eligió al crearla, o para cambiarlo).
export function ElegirMazo({ usuarioId, idActual, onElegir, onCancelar }: ElegirMazoProps) {
  const [mazos, setMazos] = useState<Deck[] | null>(null);
  const [elegido, setElegido] = useState<number | ''>(idActual ?? '');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    window.api.listarDecks(usuarioId).then(setMazos).catch(() => setMazos([]));
  }, [usuarioId]);

  if (mazos === null) return <p className="sesion__nota">Cargando mazos…</p>;
  if (mazos.length === 0) {
    return (
      <p className="sesion__nota">
        Todavía no tenés mazos. <Link to="/flashcards">Creá uno en Flashcards</Link> y elegilo acá.
      </p>
    );
  }

  async function usar() {
    if (elegido === '') return;
    setGuardando(true);
    try {
      await onElegir(elegido);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="flash-sesion">
      <label className="flash-sesion__elegir" htmlFor="sesion-mazo">
        Mazo para repasar en esta sesión
        <select id="sesion-mazo" value={elegido} onChange={(e) => setElegido(e.target.value === '' ? '' : Number(e.target.value))}>
          <option value="">Elegí un mazo</option>
          {mazos.map((m) => (
            <option key={m.idDeck} value={m.idDeck}>
              {m.nombre}{m.cantidadFlashcards !== undefined ? ` (${m.cantidadFlashcards})` : ''}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="flash-sesion__accion" disabled={elegido === '' || guardando} onClick={() => void usar()}>
        {guardando ? 'Guardando…' : 'Usar este mazo'}
      </button>
      {onCancelar && (
        <button type="button" className="flash-sesion__saltar" onClick={onCancelar}>Cancelar</button>
      )}
    </div>
  );
}
