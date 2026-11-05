import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface OpcionDesplegable {
  valor: string;
  nombre: string;
  grupo?: string; // las opciones seguidas con el mismo grupo van bajo un mismo título
}

interface DesplegableProps {
  valor: string;
  opciones: OpcionDesplegable[];
  etiqueta: string; // texto accesible
  icono?: ReactNode;
  onCambiar: (valor: string) => void;
}

// Reemplazo del <select> nativo con los colores de la paleta: se abre con clic, flechas o Enter,
// se cierra con Escape o al hacer clic afuera.
export function Desplegable({ valor, opciones, etiqueta, icono, onCambiar }: DesplegableProps) {
  const [abierto, setAbierto] = useState(false);
  const [marcada, setMarcada] = useState(0);
  const raiz = useRef<HTMLDivElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const id = useId();

  const indiceActual = Math.max(0, opciones.findIndex((o) => o.valor === valor));
  const actual = opciones[indiceActual];

  useEffect(() => {
    if (!abierto) return;
    const cerrarAfuera = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', cerrarAfuera);
    return () => document.removeEventListener('mousedown', cerrarAfuera);
  }, [abierto]);

  useEffect(() => {
    if (abierto) lista.current?.querySelector(`[data-indice="${marcada}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [abierto, marcada]);

  function abrir() {
    setMarcada(indiceActual);
    setAbierto(true);
  }

  function elegir(indice: number) {
    const opcion = opciones[indice];
    if (opcion) onCambiar(opcion.valor);
    setAbierto(false);
  }

  function teclado(e: KeyboardEvent) {
    if (!abierto) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); abrir(); }
      return;
    }
    if (e.key === 'Escape' || e.key === 'Tab') setAbierto(false);
    else if (e.key === 'ArrowDown') { e.preventDefault(); setMarcada((i) => Math.min(opciones.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setMarcada((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setMarcada(0); }
    else if (e.key === 'End') { e.preventDefault(); setMarcada(opciones.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegir(marcada); }
  }

  return (
    <div className={`desplegable${abierto ? ' desplegable--abierto' : ''}`} ref={raiz}>
      <button type="button" className="desplegable__boton" aria-label={etiqueta} aria-haspopup="listbox"
        aria-expanded={abierto} aria-controls={id} onClick={() => (abierto ? setAbierto(false) : abrir())} onKeyDown={teclado}
        aria-activedescendant={abierto ? `${id}-${marcada}` : undefined}>
        {icono}
        <span className="desplegable__valor">{actual?.nombre ?? ''}</span>
        <ChevronDown size={16} className="desplegable__flecha" aria-hidden="true" />
      </button>
      {abierto && (
        <ul className="desplegable__lista" role="listbox" id={id} ref={lista} aria-label={etiqueta}>
          {opciones.map((o, i) => (
            <li key={o.valor} role="presentation">
              {o.grupo && o.grupo !== opciones[i - 1]?.grupo && <span className="desplegable__grupo">{o.grupo}</span>}
              <div role="option" id={`${id}-${i}`} data-indice={i} aria-selected={o.valor === valor}
                className={`desplegable__opcion${i === marcada ? ' desplegable__opcion--marcada' : ''}${o.valor === valor ? ' desplegable__opcion--elegida' : ''}`}
                onMouseEnter={() => setMarcada(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => elegir(i)}>
                <span>{o.nombre}</span>
                {o.valor === valor && <Check size={15} aria-hidden="true" />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
