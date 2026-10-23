import { useState } from 'react';
import { X } from 'lucide-react';
import { Boton } from '../comunes/boton';

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
}

// Lista de objetivos con checkbox, alta y baja. Se usa al crear la sesión y dentro de la sesión.
// Al crear, onAlternar no se pasa y no se muestra el checkbox.
export function ListaObjetivos({ objetivos, onAgregar, onAlternar, onEliminar }: ListaObjetivosProps) {
  const [nuevo, setNuevo] = useState('');

  // Agrega el objetivo escrito si no está vacío.
  function agregar() {
    const descripcion = nuevo.trim();
    if (descripcion === '') return;
    onAgregar(descripcion);
    setNuevo('');
  }

  return (
    <div className="sesiones__tarjeta">
      {objetivos.length === 0 && <p className="sesiones__nota">Todavía no hay objetivos.</p>}

      {objetivos.map((objetivo) => (
        <div key={objetivo.clave} className="sesiones__objetivo">
          {onAlternar && (
            <input
              type="checkbox"
              checked={objetivo.completado}
              onChange={(e) => onAlternar(objetivo.clave, e.target.checked)}
            />
          )}
          <span className={`sesiones__objetivo-texto ${objetivo.completado ? 'sesiones__objetivo-texto--hecho' : ''}`}>
            {objetivo.descripcion}
          </span>
          <button
            type="button"
            className="app-boton-icono app-boton-icono--plano"
            aria-label="Quitar objetivo"
            onClick={() => onEliminar(objetivo.clave)}
          >
            <X size={16} />
          </button>
        </div>
      ))}

      <div className="sesiones__objetivo-nuevo">
        <input
          value={nuevo}
          maxLength={300}
          placeholder="Escribí un objetivo..."
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              agregar();
            }
          }}
        />
        <Boton variante="contorno" onClick={agregar}>
          + Nuevo objetivo
        </Boton>
      </div>
    </div>
  );
}
