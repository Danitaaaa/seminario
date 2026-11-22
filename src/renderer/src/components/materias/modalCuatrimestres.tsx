import { FormEvent, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { Boton } from '../comunes/boton';
import type { CuatrimestreCursada, Receso } from '../../types/materias';
import { estadoCuatrimestre, fechasSugeridas, momentoDe, rangoCuatrimestre } from '../../utils/cuatrimestres';
import { mensajeDeError } from '../../pages/materias/utilidadesMaterias';

interface ModalCuatrimestresProps {
  usuarioId: number;
  onCerrar: () => void;
  onCambio?: () => void; // se creó, editó o borró alguno
  editarId?: number; // abre directo la edición de ese cuatrimestre
}

interface Formulario {
  idCuatrimestre?: number;
  anio: string;
  tipo: 'primero' | 'segundo';
  fechaInicio: string;
  fechaFin: string;
  recesos: Receso[];
  copiarHorariosDe: string;
}

function nuevoFormulario(lista: CuatrimestreCursada[]): Formulario {
  // Propone el que sigue al último cargado.
  const ultimo = [...lista].sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio))[0];
  const anio = ultimo ? (ultimo.tipo === 'segundo' ? ultimo.anio + 1 : ultimo.anio) : new Date().getFullYear();
  const tipo = ultimo ? (ultimo.tipo === 'segundo' ? 'primero' : 'segundo') : new Date().getMonth() < 6 ? 'primero' : 'segundo';
  return { anio: String(anio), tipo, ...fechasSugeridas(anio, tipo), recesos: [], copiarHorariosDe: ultimo ? String(ultimo.idCuatrimestre) : '' };
}

// "Mis cuatrimestres": fechas de cursada, feriados y recesos. Valen para todas las formaciones.
export function ModalCuatrimestres({ usuarioId, onCerrar, onCambio, editarId }: ModalCuatrimestresProps) {
  const [lista, setLista] = useState<CuatrimestreCursada[] | null>(null);
  const [form, setForm] = useState<Formulario | null>(null);
  const [porBorrar, setPorBorrar] = useState<CuatrimestreCursada | null>(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function cargar(): Promise<CuatrimestreCursada[]> {
    const cuatris = await window.api.listarCuatrimestres({ usuarioId });
    setLista(cuatris);
    return cuatris;
  }

  useEffect(() => {
    cargar()
      .then((cuatris) => {
        const elegido = cuatris.find((c) => c.idCuatrimestre === editarId);
        if (elegido) editar(elegido);
        else if (cuatris.length === 0) setForm(nuevoFormulario([]));
      })
      .catch((e) => setError(mensajeDeError(e, 'No se pudieron cargar tus cuatrimestres.')));
  }, []);

  function editar(c: CuatrimestreCursada): void {
    setError('');
    setForm({
      idCuatrimestre: c.idCuatrimestre, anio: String(c.anio), tipo: c.tipo,
      fechaInicio: c.fechaInicio, fechaFin: c.fechaFin, recesos: c.recesos, copiarHorariosDe: '',
    });
  }

  // Al cambiar año o cuatrimestre de uno nuevo, se sugieren las fechas de siempre.
  function cambiarPeriodo(anio: string, tipo: 'primero' | 'segundo'): void {
    if (!form) return;
    const sugeridas = !form.idCuatrimestre && Number(anio) > 1999 ? fechasSugeridas(Number(anio), tipo) : {};
    setForm({ ...form, anio, tipo, ...sugeridas });
  }

  const cambiarReceso = (i: number, cambios: Partial<Receso>) =>
    form && setForm({ ...form, recesos: form.recesos.map((r, j) => (j === i ? { ...r, ...cambios } : r)) });

  async function guardar(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!form) return;
    setGuardando(true);
    setError('');
    try {
      await window.api.guardarCuatrimestre({
        usuarioId,
        idCuatrimestre: form.idCuatrimestre,
        anio: Number(form.anio),
        tipo: form.tipo,
        fechaInicio: form.fechaInicio,
        fechaFin: form.fechaFin,
        recesos: form.recesos.map((r) => ({ ...r, hasta: r.hasta || r.desde, descripcion: r.descripcion?.trim() || null })),
        copiarHorariosDe: form.copiarHorariosDe ? Number(form.copiarHorariosDe) : undefined,
      });
      setForm(null);
      await cargar();
      onCambio?.();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo guardar el cuatrimestre.'));
    } finally {
      setGuardando(false);
    }
  }

  async function borrar(): Promise<void> {
    if (!porBorrar) return;
    try {
      await window.api.eliminarCuatrimestre({ usuarioId, idCuatrimestre: porBorrar.idCuatrimestre });
      setPorBorrar(null);
      await cargar();
      onCambio?.();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo eliminar el cuatrimestre.'));
    }
  }

  return (
    <div className="materias-fondo-modal" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="materias-modal cuatris-modal" role="dialog" aria-modal="true" aria-labelledby="titulo-cuatris">
        <div className="materias-modal__cabecera">
          <div>
            <h2 id="titulo-cuatris">Mis cuatrimestres</h2>
            <p>Las fechas de cursada valen para todas tus formaciones. Las clases se copian a Google Calendar solo dentro de estas fechas.</p>
          </div>
          <button type="button" className="materias-icono" aria-label="Cerrar" onClick={onCerrar}><X size={20} /></button>
        </div>

        {lista && lista.length > 0 && (
          <ul className="cuatris-lista">
            {lista.map((c) => (
              <li key={c.idCuatrimestre} className="cuatris-fila">
                <div>
                  <strong>{c.nombre}</strong>
                  <span>
                    {rangoCuatrimestre(c)}
                    {c.recesos.length > 0 && ` · ${c.recesos.length === 1 ? '1 feriado o receso' : `${c.recesos.length} feriados o recesos`}`}
                  </span>
                </div>
                <span className={`cuatris-estado cuatris-estado--${momentoDe(c)}`}>{estadoCuatrimestre(c)}</span>
                <div>
                  <button type="button" className="materias-icono" aria-label={`Editar ${c.nombre}`} onClick={() => editar(c)}><Pencil size={16} /></button>
                  <button type="button" className="materias-icono" aria-label={`Eliminar ${c.nombre}`} onClick={() => setPorBorrar(c)}><Trash2 size={16} /></button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {porBorrar && (
          <div className="cuatris-confirmar" role="alert">
            <p>
              ¿Eliminar el {porBorrar.nombre}? Se borran sus {porBorrar.horarios} horarios. Los cuadernos no se borran: quedan sin cuatrimestre.
            </p>
            <div className="materias-acciones">
              <Boton variante="contorno" onClick={() => setPorBorrar(null)}>Cancelar</Boton>
              <Boton onClick={() => void borrar()}>Eliminar</Boton>
            </div>
          </div>
        )}

        {form ? (
          <form className="cuatris-form" onSubmit={guardar}>
            <h3>{form.idCuatrimestre ? 'Editar cuatrimestre' : 'Nuevo cuatrimestre'}</h3>
            <div className="materias-fila">
              <label className="materias-campo">Año
                <input type="number" min={2000} max={2100} value={form.anio} onChange={(e) => cambiarPeriodo(e.target.value, form.tipo)} />
              </label>
              <label className="materias-campo">Cuatrimestre
                <select value={form.tipo} onChange={(e) => cambiarPeriodo(form.anio, e.target.value as 'primero' | 'segundo')}>
                  <option value="primero">1er cuatrimestre</option>
                  <option value="segundo">2do cuatrimestre</option>
                </select>
              </label>
            </div>
            <div className="materias-fila">
              <label className="materias-campo">Empieza
                <input type="date" value={form.fechaInicio} onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} />
              </label>
              <label className="materias-campo">Termina
                <input type="date" value={form.fechaFin} onChange={(e) => setForm({ ...form, fechaFin: e.target.value })} />
              </label>
            </div>

            <fieldset className="materias-campo materias-campo--grupo">
              <legend>Feriados y recesos (esos días no hay clase)</legend>
              {form.recesos.map((r, i) => (
                <div key={i} className="cuatris-receso">
                  <input type="date" aria-label="Desde" value={r.desde} onChange={(e) => cambiarReceso(i, { desde: e.target.value })} />
                  <input type="date" aria-label="Hasta (si es más de un día)" value={r.hasta} onChange={(e) => cambiarReceso(i, { hasta: e.target.value })} />
                  <input aria-label="Descripción" placeholder="Feriado, vacaciones de invierno…" maxLength={60} value={r.descripcion ?? ''}
                    onChange={(e) => cambiarReceso(i, { descripcion: e.target.value })} />
                  <button type="button" className="materias-icono" aria-label="Quitar"
                    onClick={() => setForm({ ...form, recesos: form.recesos.filter((_, j) => j !== i) })}><X size={16} /></button>
                </div>
              ))}
              <button type="button" className="materias-link cuatris-agregar"
                onClick={() => setForm({ ...form, recesos: [...form.recesos, { desde: form.fechaInicio, hasta: form.fechaInicio, descripcion: null }] })}>
                <Plus size={14} /> Agregar feriado o receso
              </button>
            </fieldset>

            {!form.idCuatrimestre && lista && lista.some((c) => c.horarios > 0) && (
              <label className="materias-campo">Copiar los horarios de
                <select value={form.copiarHorariosDe} onChange={(e) => setForm({ ...form, copiarHorariosDe: e.target.value })}>
                  <option value="">No copiar (los cargo en Horarios)</option>
                  {lista.filter((c) => c.horarios > 0).map((c) => (
                    <option key={c.idCuatrimestre} value={c.idCuatrimestre}>{c.nombre} ({c.horarios} horarios)</option>
                  ))}
                </select>
              </label>
            )}

            {error && <p className="materias-error" role="alert">{error}</p>}
            <div className="materias-acciones">
              {lista && lista.length > 0 && <Boton variante="contorno" onClick={() => { setForm(null); setError(''); }}>Cancelar</Boton>}
              <Boton type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Boton>
            </div>
          </form>
        ) : (
          <>
            {error && <p className="materias-error" role="alert">{error}</p>}
            <div className="materias-acciones">
              <Boton variante="contorno" onClick={onCerrar}>Cerrar</Boton>
              <Boton onClick={() => lista && setForm(nuevoFormulario(lista))}><Plus size={16} /> Nuevo cuatrimestre</Boton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
