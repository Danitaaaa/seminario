import { useState } from 'react';
import { CheckCircle2, Plus, X } from 'lucide-react';

// Meta tal como lo maneja la lista, ya sea de una sesión guardada o de una que se está creando.
export interface ObjetivoItem {
  clave: string | number;
  descripcion: string;
  completado: boolean;
}

interface ListaObjetivosProps {
  metas: ObjetivoItem[];
  onAgregar: (descripcion: string) => void;
  onAlternar?: (clave: string | number, completado: boolean) => void;
  onEliminar: (clave: string | number) => void;
  // Título del grupo (dentro de la sesión). Al crear la sesión no se muestra.
  titulo?: string;
}

// Lista de metas con checkbox, alta y baja. Se usa al crear la sesión y dentro de la sesión.
// Al crear, onAlternar no se pasa y no se muestra el checkbox.
export function ListaObjetivos({ metas, onAgregar, onAlternar, onEliminar, titulo }: ListaObjetivosProps) {
  const [nuevo, setNuevo] = useState('');
  const hechos = metas.filter((o) => o.completado).length;

  // Agrega el meta escrito si no está vacío.
  function agregar() {
    const descripcion = nuevo.trim();
    if (descripcion === '') return;
    onAgregar(descripcion);
    setNuevo('');
  }

  return (
    <div className="metas">
      {titulo && (
        <div className="objetivos__titulo">
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>{titulo}</span>
          {metas.length > 0 && <span className="objetivos__contador">{hechos}/{metas.length}</span>}
        </div>
      )}

      {metas.length === 0 && <p className="objetivos__vacio">Todavía no hay metas.</p>}

      <ul className="objetivos__lista">
        {metas.map((meta) => (
          <li key={meta.clave} className="objetivos__item">
            {onAlternar ? (
              <label className="objetivos__check">
                <input
                  type="checkbox"
                  checked={meta.completado}
                  onChange={(e) => onAlternar(meta.clave, e.target.checked)}
                />
                <span className={meta.completado ? 'objetivos__texto objetivos__texto--hecho' : 'objetivos__texto'}>
                  {meta.descripcion}
                </span>
              </label>
            ) : (
              <span className="objetivos__texto objetivos__texto--punto">{meta.descripcion}</span>
            )}
            <button
              type="button"
              className="objetivos__quitar"
              aria-label={`Quitar meta ${meta.descripcion}`}
              title="Quitar"
              onClick={() => onEliminar(meta.clave)}
            >
              <X size={14} />
            </button>
          </li>
        ))}
      </ul>

      <div className="objetivos__nuevo">
        <input
          value={nuevo}
          maxLength={300}
          placeholder="Nuevo meta…"
          aria-label="Nuevo meta"
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              agregar();
            }
          }}
        />
        <button
          type="button"
          className="objetivos__agregar"
          aria-label="Agregar meta"
          title="Agregar meta"
          disabled={nuevo.trim() === ''}
          onClick={agregar}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
