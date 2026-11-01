import { FormEvent, useState } from 'react';
import { X } from 'lucide-react';
import { Boton } from '../comunes/boton';
import type { Cuatrimestre, EstadoMateria, Formacion, MateriaFormacion } from '../../types/materias';
import { CUATRIMESTRES, ESTADOS, NOMBRE_TIPO, estadoInicial, mensajeDeError } from '../../pages/materias/utilidadesMaterias';

interface ModalMateriaProps {
  usuarioId: number;
  formaciones: Formacion[];
  idFormacion: number;
  materia?: MateriaFormacion; // si viene, se edita
  onCerrar: () => void;
  onGuardada: (materia: MateriaFormacion) => void;
}

// Alta o edición de una materia a mano.
export function ModalMateria({ usuarioId, formaciones, idFormacion, materia, onCerrar, onGuardada }: ModalMateriaProps) {
  const [formacion, setFormacion] = useState(materia?.idFormacion ?? idFormacion);
  const [nombre, setNombre] = useState(materia?.nombre ?? '');
  const [anio, setAnio] = useState<string>(materia?.anio ? String(materia.anio) : '');
  const [cuatrimestre, setCuatrimestre] = useState<Cuatrimestre | ''>(materia?.cuatrimestre ?? '');
  const [estado, setEstado] = useState<EstadoMateria>(materia?.estado ?? 'no_cursada');
  const [estadoTocado, setEstadoTocado] = useState(Boolean(materia));
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Mientras no se elija el estado a mano, sigue al año y al cuatrimestre (Cursando, No cursada...).
  function recalcular(nuevoAnio: string, nuevoCuatri: Cuatrimestre | ''): void {
    if (estadoTocado) return;
    const f = formaciones.find((x) => x.idFormacion === formacion);
    const momento = { anioActual: f?.anioActual ?? null, cuatrimestreActual: f?.cuatrimestreActual ?? null };
    setEstado(estadoInicial(nuevoAnio ? Number(nuevoAnio) : null, nuevoCuatri || null, momento, 'libre'));
  }

  function cambiarAnio(valor: string): void {
    setAnio(valor);
    recalcular(valor, cuatrimestre);
  }

  function cambiarCuatrimestre(valor: Cuatrimestre | ''): void {
    setCuatrimestre(valor);
    recalcular(anio, valor);
  }

  async function guardar(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!nombre.trim()) return setError('El nombre es obligatorio.');
    const datos = { nombre: nombre.trim(), anio: anio ? Number(anio) : null, cuatrimestre: cuatrimestre || null, estado };
    setGuardando(true);
    setError('');
    try {
      const guardada = materia
        ? await window.api.modificarMateriaFormacion({ usuarioId, idMateria: materia.idMateria, ...datos })
        : (await window.api.crearMaterias({ usuarioId, idFormacion: formacion, materias: [datos] }))[0];
      onGuardada(guardada);
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo guardar la materia.'));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="materias-fondo-modal" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <form className="materias-modal" role="dialog" aria-modal="true" aria-labelledby="titulo-materia" onSubmit={guardar}>
        <div className="materias-modal__cabecera">
          <div>
            <h2 id="titulo-materia">{materia ? 'Editar materia' : 'Nueva materia'}</h2>
            {!materia && <p>Se agrega a la formación que elijas.</p>}
          </div>
          <button type="button" className="materias-icono" aria-label="Cerrar" onClick={onCerrar}><X size={20} /></button>
        </div>

        {!materia && (
          <label className="materias-campo">Formación
            <select value={formacion} onChange={(e) => setFormacion(Number(e.target.value))}>
              {formaciones.map((f) => (
                <option key={f.idFormacion} value={f.idFormacion}>{f.nombre} · {NOMBRE_TIPO[f.tipo]}</option>
              ))}
            </select>
          </label>
        )}

        <label className="materias-campo">Nombre *
          <input value={nombre} maxLength={100} placeholder="Análisis Matemático II" autoFocus onChange={(e) => setNombre(e.target.value)} />
        </label>

        <div className="materias-fila">
          <label className="materias-campo">Año de cursado
            <input type="number" min={1} max={10} value={anio} placeholder="Sin año" onChange={(e) => cambiarAnio(e.target.value)} />
          </label>
          <label className="materias-campo">Cuatrimestre
            <select value={cuatrimestre} onChange={(e) => cambiarCuatrimestre(e.target.value as Cuatrimestre | '')}>
              <option value="">Sin definir</option>
              {CUATRIMESTRES.map((c) => <option key={c.valor} value={c.valor}>{c.nombre}</option>)}
            </select>
          </label>
        </div>

        <fieldset className="materias-campo materias-campo--grupo">
          <legend>Estado</legend>
          <div className="materias-estados">
            {ESTADOS.map((e) => (
              <label key={e.valor} className={`materias-estado-opcion materias-estado--${e.valor} ${estado === e.valor ? 'materias-estado-opcion--activa' : ''}`}>
                <input type="radio" name="estado" checked={estado === e.valor} onChange={() => { setEstado(e.valor); setEstadoTocado(true); }} />
                {e.nombre}
              </label>
            ))}
          </div>
        </fieldset>

        {error && <p className="materias-error" role="alert">{error}</p>}

        <div className="materias-acciones">
          <Boton variante="contorno" onClick={onCerrar}>Cancelar</Boton>
          <Boton type="submit" disabled={guardando}>{guardando ? 'Guardando…' : materia ? 'Guardar cambios' : 'Crear materia'}</Boton>
        </div>
      </form>
    </div>
  );
}
