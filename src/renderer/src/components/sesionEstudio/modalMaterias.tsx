import { FormEvent, useEffect, useState } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { Boton } from '../comunes/boton';
import { usarAvisos } from '../../hooks/usarAvisos';
import type { MateriaConUso } from '../../types/sesionesEstudio';
import { extraerMensajeError } from '../../pages/sesionesEstudio/utilidades';

interface ModalMateriasProps {
  usuarioId: number;
  onCerrar: () => void;
  // Avisa la lista actualizada después de cada alta, edición o baja.
  onCambio?: (materias: MateriaConUso[]) => void;
  // Avisa la materia recién registrada (el formulario de creación la deja elegida).
  onRegistrada?: (materia: MateriaConUso) => void;
}

// Modal "Materias" ("Registrar materia +"): alta, cambio de nombre y baja de materias.
// Muestra cuántas sesiones usan cada una; las que tienen sesiones no se pueden eliminar.
export function ModalMaterias({ usuarioId, onCerrar, onCambio, onRegistrada }: ModalMateriasProps) {
  const avisos = usarAvisos();
  const [materias, setMaterias] = useState<MateriaConUso[] | null>(null);
  const [nueva, setNueva] = useState('');
  const [editando, setEditando] = useState<number | null>(null);
  const [nombreEditado, setNombreEditado] = useState('');
  const [porEliminar, setPorEliminar] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    window.api
      .listarMaterias(usuarioId)
      .then(setMaterias)
      .catch((e) => setError(extraerMensajeError(e, 'No se pudieron cargar las materias.')));
  }, [usuarioId]);

  // Escape cierra la edición abierta o, si no hay ninguna, el modal.
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (editando !== null) setEditando(null);
      else if (porEliminar !== null) setPorEliminar(null);
      else onCerrar();
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [editando, porEliminar, onCerrar]);

  function actualizar(lista: MateriaConUso[]) {
    const ordenada = [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    setMaterias(ordenada);
    onCambio?.(ordenada);
  }

  async function ejecutar(accion: () => Promise<void>, generico: string) {
    setOcupado(true);
    setError(null);
    try {
      await accion();
    } catch (e) {
      setError(extraerMensajeError(e, generico));
    } finally {
      setOcupado(false);
    }
  }

  async function registrar(evento: FormEvent) {
    evento.preventDefault();
    const nombre = nueva.trim();
    if (nombre === '') return setError('Escribí el nombre de la materia.');
    await ejecutar(async () => {
      const creada = await window.api.registrarMateria({ nombre });
      actualizar([...(materias ?? []), creada]);
      setNueva('');
      avisos.exito(`Se registró la materia "${creada.nombre}" correctamente.`);
      onRegistrada?.(creada);
    }, 'No se pudo registrar la materia.');
  }

  async function guardarNombre(materia: MateriaConUso) {
    const nombre = nombreEditado.trim();
    if (nombre === '') return setError('El nombre no puede quedar vacío.');
    if (nombre === materia.nombre) return setEditando(null);
    await ejecutar(async () => {
      const modificada = await window.api.modificarMateria({ usuarioId, idMateria: materia.idMateria, nombre });
      actualizar((materias ?? []).map((m) => (m.idMateria === materia.idMateria ? modificada : m)));
      setEditando(null);
      avisos.exito(`Se cambió el nombre a "${modificada.nombre}".`);
    }, 'No se pudo cambiar el nombre.');
  }

  async function eliminar(materia: MateriaConUso) {
    await ejecutar(async () => {
      await window.api.eliminarMateria(materia.idMateria);
      actualizar((materias ?? []).filter((m) => m.idMateria !== materia.idMateria));
      setPorEliminar(null);
      avisos.exito(`Se eliminó la materia "${materia.nombre}".`);
    }, 'No se pudo eliminar la materia.');
  }

  return (
    <div className="sesiones__overlay" onClick={onCerrar}>
      <div
        className="sesiones__modal materias"
        role="dialog"
        aria-modal="true"
        aria-label="Materias"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="materias__cabecera">
          <h3 className="sesiones__modal-titulo">Materias</h3>
          <button type="button" className="materias__icono" aria-label="Cerrar" title="Cerrar" onClick={onCerrar}>
            <X size={16} />
          </button>
        </div>

        <form className="materias__nueva" onSubmit={registrar}>
          <input
            autoFocus
            value={nueva}
            maxLength={100}
            placeholder="Nueva materia, ej.: Base de datos"
            aria-label="Nombre de la nueva materia"
            onChange={(e) => setNueva(e.target.value)}
          />
          <Boton type="submit" disabled={ocupado || nueva.trim() === ''}>Registrar</Boton>
        </form>

        {error && <div className="sesiones__error">{error}</div>}

        <div className="materias__lista">
          {materias === null && <p className="materias__vacio">Cargando materias…</p>}
          {materias?.length === 0 && <p className="materias__vacio">Todavía no registraste ninguna materia.</p>}

          {materias?.map((materia) => {
            const usos = materia.cantidadSesiones;
            const textoUsos = usos === 0 ? 'Sin sesiones' : usos === 1 ? '1 sesión' : `${usos} sesiones`;

            if (editando === materia.idMateria) {
              return (
                <form
                  key={materia.idMateria}
                  className="materias__fila materias__fila--editando"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void guardarNombre(materia);
                  }}
                >
                  <input
                    autoFocus
                    value={nombreEditado}
                    maxLength={100}
                    aria-label={`Nuevo nombre para ${materia.nombre}`}
                    onChange={(e) => setNombreEditado(e.target.value)}
                  />
                  <button type="submit" className="materias__icono materias__icono--ok" aria-label="Guardar" title="Guardar" disabled={ocupado}>
                    <Check size={16} />
                  </button>
                  <button type="button" className="materias__icono" aria-label="Cancelar" title="Cancelar" onClick={() => setEditando(null)}>
                    <X size={16} />
                  </button>
                </form>
              );
            }

            if (porEliminar === materia.idMateria) {
              return (
                <div key={materia.idMateria} className="materias__fila materias__fila--confirmar">
                  <span className="materias__pregunta">¿Eliminar <strong>{materia.nombre}</strong>?</span>
                  <button type="button" className="boton-chico boton-chico--claro" onClick={() => setPorEliminar(null)}>
                    No
                  </button>
                  <button type="button" className="boton-chico boton-chico--peligro" disabled={ocupado} onClick={() => void eliminar(materia)}>
                    Eliminar
                  </button>
                </div>
              );
            }

            return (
              <div key={materia.idMateria} className="materias__fila">
                <span className="materias__nombre">{materia.nombre}</span>
                <span className="materias__usos">{textoUsos}</span>
                <button
                  type="button"
                  className="materias__icono"
                  aria-label={`Cambiar el nombre de ${materia.nombre}`}
                  title="Cambiar nombre"
                  onClick={() => {
                    setError(null);
                    setPorEliminar(null);
                    setNombreEditado(materia.nombre);
                    setEditando(materia.idMateria);
                  }}
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  className="materias__icono materias__icono--peligro"
                  aria-label={`Eliminar ${materia.nombre}`}
                  title={usos > 0 ? 'Tiene sesiones: cambiales la materia o eliminalas primero' : 'Eliminar'}
                  disabled={usos > 0}
                  onClick={() => {
                    setError(null);
                    setEditando(null);
                    setPorEliminar(materia.idMateria);
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>

        <p className="materias__nota">Las materias con sesiones no se pueden eliminar. Al cambiar el nombre, sus sesiones se actualizan solas.</p>
      </div>
    </div>
  );
}
