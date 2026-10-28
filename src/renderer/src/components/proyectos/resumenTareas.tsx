import type { SegmentoAporte } from '../../types/tareas';

interface Props {
  total: number;
  hechas: number;
  segmentos: SegmentoAporte[];
  puedeEditar: boolean;
  hayPorRepartir: boolean;
  onRepartir: () => void;
  onNueva: () => void;
}

export function ResumenTareas({ total, hechas, segmentos, puedeEditar, hayPorRepartir, onRepartir, onNueva }: Props) {
  const porcentaje = total === 0 ? 0 : Math.round((hechas / total) * 100);
  const descripcion = segmentos.length
    ? `Aporte a lo completado: ${segmentos.map((s) => `${s.nombre} ${s.hechas}`).join(', ')}`
    : 'Todavía no hay tareas hechas';

  return (
    <div className="tareas-resumen">
      <div className="tareas-resumen__cifra">
        <p>
          <strong>{hechas}</strong> de {total} hechas
        </p>
        <span>{porcentaje}% del proyecto</span>
      </div>

      <div className="tareas-resumen__barra-bloque">
        <div className="tareas-resumen__barra" role="img" aria-label={descripcion}>
          {segmentos.map((s) => (
            <div
              key={s.clave}
              className="tareas-resumen__segmento"
              style={{ width: `${s.porcentaje}%`, background: s.fondo }}
              title={`${s.nombre}: ${s.hechas}`}
            />
          ))}
        </div>
        <span className="tareas-resumen__leyenda">Aporte de cada integrante a lo completado</span>
      </div>

      {puedeEditar && (
        <div className="tareas-resumen__acciones">
          <button
            type="button"
            className="tareas-boton"
            onClick={onRepartir}
            disabled={!hayPorRepartir}
            title={hayPorRepartir ? undefined : 'No hay tareas pendientes sin asignar'}
          >
            Repartir equitativamente
          </button>
          <button type="button" className="tareas-boton tareas-boton--primario" onClick={onNueva}>
            + Nueva tarea
          </button>
        </div>
      )}
    </div>
  );
}
