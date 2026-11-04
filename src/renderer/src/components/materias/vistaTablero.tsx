import { useState } from 'react';
import type { DragEvent } from 'react';
import type { EstadoMateria, MateriaFormacion } from '../../types/materias';
import { ESTADOS, cuatrimestreCorto } from '../../pages/materias/utilidadesMaterias';

interface VistaTableroProps {
  materias: MateriaFormacion[];
  onEditar: (materia: MateriaFormacion) => void;
  onCambiarEstado: (materia: MateriaFormacion, estado: EstadoMateria) => void;
}

// Tablero con una columna por estado. Arrastrar una materia a otra columna le cambia el estado.
export function VistaTablero({ materias, onEditar, onCambiarEstado }: VistaTableroProps) {
  const [anio, setAnio] = useState<number | null>(null);
  const [arrastrada, setArrastrada] = useState<number | null>(null);
  const [destino, setDestino] = useState<EstadoMateria | null>(null);

  const anios = [...new Set(materias.map((m) => m.anio).filter((a): a is number => a !== null))].sort((a, b) => a - b);
  const visibles = anio === null ? materias : materias.filter((m) => m.anio === anio);
  // "Libre" aparece solo si alguna materia está libre.
  const columnas = ESTADOS.filter((e) => e.valor !== 'libre' || materias.some((m) => m.estado === 'libre'));

  function soltar(e: DragEvent, estado: EstadoMateria) {
    e.preventDefault();
    const materia = materias.find((m) => m.idMateria === arrastrada);
    if (materia && materia.estado !== estado) onCambiarEstado(materia, estado);
    setArrastrada(null);
    setDestino(null);
  }

  return (
    <div className="materias-tablero">
      <div className="materias-tablero__barra">
        <p className="materias-ayuda">Arrastrá una materia a otra columna para cambiarle el estado.</p>
        {anios.length > 1 && (
          <div className="materias-segmento" role="group" aria-label="Año">
            <button type="button" aria-pressed={anio === null} className={anio === null ? 'materias-segmento--activo' : ''} onClick={() => setAnio(null)}>Todos</button>
            {anios.map((a) => (
              <button key={a} type="button" aria-pressed={anio === a} className={anio === a ? 'materias-segmento--activo' : ''} onClick={() => setAnio(a)}>{a}°</button>
            ))}
          </div>
        )}
      </div>

      <div className="materias-tablero__columnas">
        {columnas.map((col) => {
          const deEstado = visibles.filter((m) => m.estado === col.valor);
          return (
            <section
              key={col.valor}
              className={`materias-tablero__columna${destino === col.valor ? ' materias-tablero__columna--destino' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDestino(col.valor); }}
              onDragLeave={() => setDestino(null)}
              onDrop={(e) => soltar(e, col.valor)}
            >
              <header className="materias-tablero__titulo">
                <span className={`materias-progreso__punto materias-progreso__punto--${col.valor}`} aria-hidden="true" />
                <h3>{col.nombre}</h3>
                <span>{deEstado.length}</span>
              </header>
              {deEstado.map((m) => (
                <button
                  key={m.idMateria}
                  type="button"
                  draggable
                  className={`materias-ficha materias-ficha--${m.estado}${arrastrada === m.idMateria ? ' materias-ficha--arrastrando' : ''}`}
                  onDragStart={() => setArrastrada(m.idMateria)}
                  onDragEnd={() => { setArrastrada(null); setDestino(null); }}
                  onClick={() => onEditar(m)}
                >
                  <strong>{m.nombre}</strong>
                  <span>{[m.anio && `${m.anio}°`, cuatrimestreCorto(m.cuatrimestre)].filter(Boolean).join(' · ')}</span>
                </button>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
