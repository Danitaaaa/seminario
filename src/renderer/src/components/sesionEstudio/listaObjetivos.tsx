import { useState } from 'react';
import { CheckCircle2, Plus, X } from 'lucide-react';

// Objetivo tal como lo maneja la lista, ya sea de una sesión guardada o de una que se está creando.
export interface ObjetivoItem {
  clave: string | number;
  descripcion: string;
  completado: boolean;
}

interface ListaObjetivosProps {
  objetivos: ObjetivoItem[];
  onAgregar: (descripcion: string) => void;
  onAlternar?: (clave: string | number, completado: boolean) => void;
  onEliminar: (clave: string | number) => void;
  // Título del grupo (dentro de la sesión). Al crear la sesión no se muestra.
  titulo?: string;
}

// Lista de objetivos con checkbox, alta y baja. Se usa al crear la sesión y dentro de la sesión.
// Al crear, onAlternar no se pasa y no se muestra el checkbox.
export function ListaObjetivos({ objetivos, onAgregar, onAlternar, onEliminar, titulo }: ListaObjetivosProps) {
  const [nuevo, setNuevo] = useState('');
  const hechos = objetivos.filter((o) => o.completado).length;

  // Agrega el objetivo escrito si no está vacío.
  function agregar() {
    const descripcion = nuevo.trim();
    if (descripcion === '') return;
    onAgregar(descripcion);
    setNuevo('');
  }

  return (
    <div className="objetivos">
      {titulo && (
        <div className="objetivos__titulo">
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>{titulo}</span>
          {objetivos.length > 0 && <span className="objetivos__contador">{hechos}/{objetivos.length}</span>}
        </div>
      )}

      {objetivos.length === 0 && <p className="objetivos__vacio">Todavía no hay objetivos.</p>}

      <ul className="objetivos__lista">
        {objetivos.map((objetivo) => (
          <li key={objetivo.clave} className="objetivos__item">
            {onAlternar ? (
              <label className="objetivos__check">
                <input
                  type="checkbox"
                  checked={objetivo.completado}
                  onChange={(e) => onAlternar(objetivo.clave, e.target.checked)}
                />
                <span className={objetivo.completado ? 'objetivos__texto objetivos__texto--hecho' : 'objetivos__texto'}>
                  {objetivo.descripcion}
                </span>
              </label>
            ) : (
              <span className="objetivos__texto objetivos__texto--punto">{objetivo.descripcion}</span>
            )}
            <button
              type="button"
              className="objetivos__quitar"
              aria-label={`Quitar objetivo ${objetivo.descripcion}`}
              title="Quitar"
              onClick={() => onEliminar(objetivo.clave)}
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
          placeholder="Nuevo objetivo…"
          aria-label="Nuevo objetivo"
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
          aria-label="Agregar objetivo"
          title="Agregar objetivo"
          disabled={nuevo.trim() === ''}
          onClick={agregar}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
