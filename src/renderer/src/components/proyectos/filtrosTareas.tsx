import type { FiltroTareas } from '../../types/tareas';

const OPCIONES: { clave: FiltroTareas; etiqueta: string }[] = [
  { clave: 'todas', etiqueta: 'Todas' },
  { clave: 'pendientes', etiqueta: 'Pendientes' },
  { clave: 'hechas', etiqueta: 'Hechas' },
  { clave: 'sinAsignar', etiqueta: 'Sin asignar' },
];

interface Props {
  filtro: FiltroTareas;
  cuentas: Record<FiltroTareas, number>;
  onCambiar: (filtro: FiltroTareas) => void;
}

export function FiltrosTareas({ filtro, cuentas, onCambiar }: Props) {
  return (
    <div className="tareas-filtros" role="group" aria-label="Filtrar tareas">
      {OPCIONES.map(({ clave, etiqueta }) => (
        <button
          key={clave}
          type="button"
          className={`tareas-filtro${filtro === clave ? ' tareas-filtro--activo' : ''}`}
          aria-pressed={filtro === clave}
          onClick={() => onCambiar(clave)}
        >
          {etiqueta} · {cuentas[clave]}
        </button>
      ))}
    </div>
  );
}
