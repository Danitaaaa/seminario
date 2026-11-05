import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { EstadoMateria, MateriaFormacion } from '../../types/materias';
import { ESTADOS, NOMBRE_ESTADO, agruparPorAnio } from '../../pages/materias/utilidadesMaterias';

type Filtro = 'todas' | EstadoMateria;

interface VistaPorAnioProps {
  materias: MateriaFormacion[];
  onEditar: (materia: MateriaFormacion) => void;
  onEliminar: (materia: MateriaFormacion) => void;
}

// Plan de estudios por año y cuatrimestre, con filtro por estado.
export function VistaPorAnio({ materias, onEditar, onEliminar }: VistaPorAnioProps) {
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const anios = agruparPorAnio(filtro === 'todas' ? materias : materias.filter((m) => m.estado === filtro));

  return (
    <>
      <div className="materias-filtros">
        <span>Mostrar:</span>
        {(['todas', ...ESTADOS.map((e) => e.valor)] as Filtro[]).map((f) => (
          <button key={f} type="button" aria-pressed={filtro === f}
            className={`materias-chip ${filtro === f ? 'materias-chip--activo' : ''}`} onClick={() => setFiltro(f)}>
            {f === 'todas' ? 'Todas' : NOMBRE_ESTADO[f]}
          </button>
        ))}
      </div>

      {anios.map((anio) => (
        <section key={anio.titulo} className="materias-anio">
          <h2>{anio.titulo}</h2>
          {anio.grupos.map((grupo) => (
            <div key={grupo.titulo} className="materias-grupo">
              <span className="materias-grupo__titulo">{grupo.titulo}</span>
              <div className="materias-grilla">
                {grupo.materias.map((m) => (
                  <article key={m.idMateria} className="materias-tarjeta">
                    <div className="materias-tarjeta__cabecera">
                      <strong>{m.nombre}</strong>
                      <div>
                        <button type="button" className="materias-icono" aria-label={`Editar ${m.nombre}`} onClick={() => onEditar(m)}><Pencil size={16} /></button>
                        <button type="button" className="materias-icono" aria-label={`Eliminar ${m.nombre}`} onClick={() => onEliminar(m)}><Trash2 size={16} /></button>
                      </div>
                    </div>
                    <span className={`materias-pildora materias-estado--${m.estado}`}>{NOMBRE_ESTADO[m.estado]}</span>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </>
  );
}
