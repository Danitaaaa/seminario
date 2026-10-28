import { FormEvent, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { DatosTarea, MiembroTablero, Prioridad, Tarea } from '../../types/tareas';
import { nombreCorto } from '../../utils/tablero';

interface Props {
  // null = tarea nueva
  tarea: Tarea | null;
  // id de la columna a la que pertenece hoy la tarea (ya normalizado)
  idAsignadoInicial: number | null;
  asignables: MiembroTablero[];
  onGuardar: (datos: DatosTarea) => Promise<boolean>;
  onEliminar?: () => Promise<boolean>;
  onCerrar: () => void;
  // Edición compartida: aviso (BannerEdicion) y bloqueo de campos cuando no se puede editar
  banner?: ReactNode;
  soloLectura?: boolean;
}

// '' = sin asignar. Devuelve undefined si el valor no es un id válido (así nunca se manda NaN).
const leerIdAsignado = (v: string): number | null | undefined => {
  if (v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

export function ModalTarea({
  tarea,
  idAsignadoInicial,
  asignables,
  onGuardar,
  onEliminar,
  onCerrar,
  banner,
  soloLectura = false,
}: Props) {
  const [titulo, setTitulo] = useState(tarea?.titulo ?? '');
  const [descripcion, setDescripcion] = useState(tarea?.descripcion ?? '');
  const [prioridad, setPrioridad] = useState<Prioridad>(tarea?.prioridad ?? 'media');
  const [fechaLimite, setFechaLimite] = useState(tarea?.fechaLimite ?? '');
  const [idAsignado, setIdAsignado] = useState(idAsignadoInicial == null ? '' : String(idAsignadoInicial));
  const [errorTitulo, setErrorTitulo] = useState<string | null>(null);
  const [errorAsignado, setErrorAsignado] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);

  useEffect(() => {
    function alTeclear(e: KeyboardEvent) {
      if (e.key === 'Escape') onCerrar();
    }
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [onCerrar]);

  // Una tarea hecha no puede quedar sin asignar.
  const permiteSinAsignar = !tarea?.completada;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (soloLectura) return;

    const limpio = titulo.trim();
    if (!limpio) {
      setErrorTitulo('Poné un título para la tarea.');
      return;
    }

    const asignado = leerIdAsignado(idAsignado);
    if (asignado === undefined) {
      setErrorAsignado('No se pudo leer el integrante asignado. Elegí otro e intentá de nuevo.');
      return;
    }

    setOcupado(true);
    const ok = await onGuardar({
      titulo: limpio,
      descripcion: descripcion.trim() === '' ? null : descripcion.trim(),
      prioridad,
      fechaLimite: fechaLimite === '' ? null : fechaLimite,
      idAsignado: asignado,
    });
    setOcupado(false);
    if (ok) onCerrar();
  }

  async function borrar() {
    if (!onEliminar || soloLectura) return;
    setOcupado(true);
    const ok = await onEliminar();
    setOcupado(false);
    if (ok) onCerrar();
  }

  return (
    <div className="tarea-modal-fondo" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <form className="tarea-modal" role="dialog" aria-modal="true" aria-labelledby="tarea-modal-titulo" onSubmit={enviar}>
        <h2 id="tarea-modal-titulo">{tarea ? 'Editar tarea' : 'Nueva tarea'}</h2>

        {banner}

        <label className="tarea-campo">
          <span>Título</span>
          <input
            type="text"
            value={titulo}
            maxLength={200}
            autoFocus
            disabled={soloLectura}
            onChange={(e) => {
              setTitulo(e.target.value);
              setErrorTitulo(null);
            }}
            aria-invalid={errorTitulo !== null}
          />
          {errorTitulo && <small className="tarea-campo__error">{errorTitulo}</small>}
        </label>

        <label className="tarea-campo">
          <span>Descripción (opcional)</span>
          <textarea
            value={descripcion}
            maxLength={1000}
            rows={3}
            disabled={soloLectura}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </label>

        <div className="tarea-modal__fila">
          <label className="tarea-campo">
            <span>Prioridad</span>
            <select value={prioridad} disabled={soloLectura} onChange={(e) => setPrioridad(e.target.value as Prioridad)}>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </label>

          <label className="tarea-campo">
            <span>Fecha límite</span>
            <input type="date" value={fechaLimite} disabled={soloLectura} onChange={(e) => setFechaLimite(e.target.value)} />
          </label>
        </div>

        <label className="tarea-campo">
          <span>Asignada a</span>
          <select
            value={idAsignado}
            disabled={soloLectura}
            onChange={(e) => {
              setIdAsignado(e.target.value);
              setErrorAsignado(null);
            }}
            aria-invalid={errorAsignado !== null}
          >
            {permiteSinAsignar && <option value="">Sin asignar</option>}
            {asignables.map((m) => (
              <option key={m.idUsuario} value={String(m.idUsuario)}>
                {nombreCorto(m.nombre)}
              </option>
            ))}
          </select>
          {errorAsignado && <small className="tarea-campo__error">{errorAsignado}</small>}
        </label>

        <div className="tarea-modal__acciones">
          {tarea && onEliminar && !soloLectura && (
            <button
              type="button"
              className="tareas-boton tareas-boton--peligro"
              disabled={ocupado}
              onClick={() => (confirmandoBorrado ? borrar() : setConfirmandoBorrado(true))}
            >
              {confirmandoBorrado ? 'Confirmar eliminación' : 'Eliminar'}
            </button>
          )}
          <span className="tarea-modal__espacio" />
          <button type="button" className="tareas-boton" onClick={onCerrar} disabled={ocupado}>
            {soloLectura ? 'Cerrar' : 'Cancelar'}
          </button>
          {!soloLectura && (
            <button type="submit" className="tareas-boton tareas-boton--primario" disabled={ocupado}>
              {tarea ? 'Guardar' : 'Crear tarea'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}