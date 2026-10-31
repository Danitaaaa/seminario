import type { DragEvent } from 'react';
import { Lock, Pencil, Trash2 } from 'lucide-react';
import type { RolMiembro } from '../../types/proyectos';
import type { Prioridad, Tarea } from '../../types/tareas';
import { puede } from '../../permisos';
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
  onAsignar: (tarea: Tarea, idAsignadoGlobal: string | null) => void;
  onArrastrarInicio: (tarea: Tarea) => void;
  onArrastrarFin: () => void;
}

interface Props extends AccionesTarjeta {
  tarea: Tarea;
  rol: RolMiembro | null;
  arrastrando: boolean;
  bloqueadaPor?: string; // nombre de quien la está editando
}

export function TarjetaTarea({
  tarea,
  rol,
  arrastrando,
  bloqueadaPor,
  onAlternar,
  onEditar,
  onEliminar,
  onArrastrarInicio,
  onArrastrarFin,
}: Props) {
  const asignada = tarea.idAsignadoGlobal !== null;
  const bloqueada = !!bloqueadaPor;
  const puedeEditarTarea = puede(rol, 'tarea.editar');
  const puedeBorrarTarea = puede(rol, 'tarea.eliminar');
  const arrastrable = puede(rol, 'tarea.asignar') && !tarea.completada && !bloqueada;

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
        bloqueada ? 'tarea-tarjeta--bloqueada' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-titulo={tarea.titulo}
      title={bloqueada ? `${bloqueadaPor} está editando esta tarea` : undefined}
      draggable={arrastrable}
      onDragStart={arrastrable ? alIniciarArrastre : undefined}
      onDragEnd={arrastrable ? onArrastrarFin : undefined}
    >
      {asignada ? (
        <input
          type="checkbox"
          className="tarea-tarjeta__check"
          checked={tarea.completada}
          disabled={!puede(rol, 'tarea.alternar') || bloqueada}
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
        {puedeEditarTarea ? (
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
          {bloqueada && (
            <span className="tarea-chip tarea-chip--bloqueo">
              <Lock size={11} /> {bloqueadaPor} está editando
            </span>
          )}
        </div>
      </div>

      {(puedeEditarTarea || puedeBorrarTarea) && (
        <div className="tarea-tarjeta__acciones">
          {puedeEditarTarea && (
            <button
              type="button"
              className="tarea-tarjeta__accion"
              aria-label={`Editar «${tarea.titulo}»`}
              title="Editar"
              onClick={() => onEditar(tarea)}
            >
              <Pencil size={14} />
            </button>
          )}
          {puedeBorrarTarea && (
            <button
              type="button"
              className="tarea-tarjeta__accion tarea-tarjeta__accion--peligro"
              aria-label={`Eliminar «${tarea.titulo}»`}
              title="Eliminar"
              disabled={bloqueada}
              onClick={() => onEliminar(tarea)}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}
    </article>
  );
}