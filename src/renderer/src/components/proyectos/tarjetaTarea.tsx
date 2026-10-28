import type { DragEvent } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { Prioridad, Tarea } from '../../types/tareas';
import { estaVencida, formatearHecha, formatearVence } from '../../utils/fechasTareas';

const ETIQUETA_PRIORIDAD: Record<Prioridad, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

export interface AccionesTarjeta {
  onAlternar: (tarea: Tarea) => void;
  onEditar: (tarea: Tarea) => void;
  onEliminar: (tarea: Tarea) => void;
  // Ya no se usa desde la tarjeta (se asigna arrastrando o desde el modal); se conserva por compatibilidad.
  onAsignar: (tarea: Tarea, idAsignado: number | null) => void;
  onArrastrarInicio: (tarea: Tarea) => void;
  onArrastrarFin: () => void;
}

interface Props extends AccionesTarjeta {
  tarea: Tarea;
  puedeEditar: boolean;
  arrastrando: boolean;
}

export function TarjetaTarea({
  tarea,
  puedeEditar,
  arrastrando,
  onAlternar,
  onEditar,
  onEliminar,
  onArrastrarInicio,
  onArrastrarFin,
}: Props) {
  const asignada = tarea.idAsignado !== null;
  const arrastrable = puedeEditar && !tarea.completada;

  function alIniciarArrastre(e: DragEvent<HTMLElement>) {
    const origen = e.currentTarget;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(tarea.idTarea));

    // Imagen de arrastre: copia inclinada de la tarjeta, fuera de pantalla.
    const copia = origen.cloneNode(true) as HTMLElement;
    copia.classList.add('tarea-tarjeta--en-vuelo');
    copia.style.width = `${origen.offsetWidth}px`;
    document.body.appendChild(copia);
    e.dataTransfer.setDragImage(copia, 24, 24);
    setTimeout(() => copia.remove(), 0);

    // El marcador "moviéndose…" se aplica después de que el navegador captura la imagen.
    setTimeout(() => onArrastrarInicio(tarea), 0);
  }

  const claseFecha = !tarea.completada && estaVencida(tarea.fechaLimite)
    ? 'tarea-tarjeta__fecha tarea-tarjeta__fecha--vencida'
    : 'tarea-tarjeta__fecha';

  return (
    <article
      className={[
        'tarea-tarjeta',
        tarea.completada ? 'tarea-tarjeta--hecha' : '',
        arrastrando ? 'tarea-tarjeta--fantasma' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-titulo={tarea.titulo}
      draggable={arrastrable}
      onDragStart={arrastrable ? alIniciarArrastre : undefined}
      onDragEnd={arrastrable ? onArrastrarFin : undefined}
    >
      {asignada ? (
        <input
          type="checkbox"
          className="tarea-tarjeta__check"
          checked={tarea.completada}
          disabled={!puedeEditar}
          onChange={() => onAlternar(tarea)}
          aria-label={`Marcar como ${tarea.completada ? 'pendiente' : 'hecha'}: ${tarea.titulo}`}
        />
      ) : (
        arrastrable && (
          <span className="tarea-tarjeta__agarre" aria-hidden="true">
            ⋮⋮
          </span>
        )
      )}

      <div className="tarea-tarjeta__cuerpo">
        {puedeEditar ? (
          <button type="button" className="tarea-tarjeta__titulo" onClick={() => onEditar(tarea)}>
            {tarea.titulo}
          </button>
        ) : (
          <span className="tarea-tarjeta__titulo">{tarea.titulo}</span>
        )}
        <div className="tarea-tarjeta__meta">
          <span className={claseFecha}>
            {tarea.completada ? formatearHecha(tarea.fechaCompletada) : formatearVence(tarea.fechaLimite)}
          </span>
          <span className="tarea-chip">{ETIQUETA_PRIORIDAD[tarea.prioridad]}</span>
        </div>
      </div>

      {puedeEditar && (
        <div className="tarea-tarjeta__acciones">
          <button
            type="button"
            className="tarea-tarjeta__accion"
            aria-label={`Editar «${tarea.titulo}»`}
            title="Editar"
            onClick={() => onEditar(tarea)}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            className="tarea-tarjeta__accion tarea-tarjeta__accion--peligro"
            aria-label={`Eliminar «${tarea.titulo}»`}
            title="Eliminar"
            onClick={() => onEliminar(tarea)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </article>
  );
}