import { FormEvent, useEffect, useState } from 'react';
import { Boton } from '../comunes/boton';
import { obtenerUsuarioId } from '../../../lib/sesion';
import type { OpcionMateria } from '../../types/materias';
import type { ResumenCuaderno } from '../../types/cuadernos';
import { NOMBRE_ESTADO } from '../../pages/materias/utilidadesMaterias';

interface ModalCuadernoProps {
  cuaderno?: ResumenCuaderno; // si viene, se edita
  usadas: number[]; // materias que ya tienen cuaderno
  onGuardar: (datos: { nombre: string; idMateria: number }) => Promise<boolean>;
  onEliminar?: () => void;
  onCerrar: () => void;
}

// Crear o editar un cuaderno: nombre y la materia de la que junta todo.
export function ModalCuaderno({ cuaderno, usadas, onGuardar, onEliminar, onCerrar }: ModalCuadernoProps) {
  const [materias, setMaterias] = useState<OpcionMateria[] | null>(null);
  const [nombre, setNombre] = useState(cuaderno?.nombre ?? '');
  const [idMateria, setIdMateria] = useState<number | ''>(cuaderno?.materia.idMateria ?? '');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    window.api.listarMateriasUsuario({ usuarioId: obtenerUsuarioId() ?? 0 })
      .then(setMaterias)
      .catch(() => setMaterias([]));
  }, []);

  // Se ofrecen las materias sin cuaderno (y la propia al editar), agrupadas por formación y año.
  const disponibles = (materias ?? []).filter((m) => !usadas.includes(m.idMateria) || m.idMateria === cuaderno?.materia.idMateria);
  const grupos = disponibles.reduce<{ grupo: string; materias: OpcionMateria[] }[]>((acc, m) => {
    const ultimo = acc[acc.length - 1];
    if (ultimo && ultimo.grupo === m.grupo) ultimo.materias.push(m);
    else acc.push({ grupo: m.grupo, materias: [m] });
    return acc;
  }, []);

  function elegirMateria(valor: string): void {
    const id = valor === '' ? '' : Number(valor);
    // Si todavía no le pusiste nombre, se propone el de la materia.
    const anterior = materias?.find((m) => m.idMateria === idMateria)?.nombre;
    const nueva = materias?.find((m) => m.idMateria === id)?.nombre;
    if (nueva && (!nombre.trim() || nombre === anterior)) setNombre(nueva);
    setIdMateria(id);
  }

  async function guardar(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (idMateria === '') return setError('Elegí la materia del cuaderno.');
    if (!nombre.trim()) return setError('Ponele un nombre al cuaderno.');
    setGuardando(true);
    setError('');
    const ok = await onGuardar({ nombre: nombre.trim(), idMateria });
    setGuardando(false);
    if (ok) onCerrar();
  }

  return (
    <div className="materias-fondo-modal">
      <form className="materias-modal" role="dialog" aria-modal="true" aria-labelledby="titulo-cuaderno" onSubmit={(e) => void guardar(e)}>
        <h2 id="titulo-cuaderno">{cuaderno ? 'Editar cuaderno' : 'Nuevo cuaderno'}</h2>

        <label className="materias-campo">Materia
          <select value={idMateria} onChange={(e) => elegirMateria(e.target.value)} autoFocus>
            <option value="">{materias === null ? 'Cargando…' : 'Elegí una materia'}</option>
            {grupos.map((g) => (
              <optgroup key={g.grupo} label={g.grupo}>
                {g.materias.map((m) => <option key={m.idMateria} value={m.idMateria}>{m.nombre} · {NOMBRE_ESTADO[m.estado]}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        {materias !== null && disponibles.length === 0 && (
          <p className="materias-ayuda">Todas tus materias ya tienen cuaderno. Cargá más materias desde Materias.</p>
        )}

        <label className="materias-campo">Nombre
          <input value={nombre} maxLength={100} placeholder="Desarrollo de Software" onChange={(e) => setNombre(e.target.value)} />
        </label>
        <p className="materias-ayuda">El cuaderno junta las carpetas de Material, los mazos y las sesiones de esa materia, y guarda tus notas.</p>

        {error && <p className="materias-error" role="alert">{error}</p>}

        <div className="materias-acciones materias-acciones--separadas">
          {onEliminar ? <button type="button" className="materias-link materias-link--peligro" onClick={onEliminar}>Eliminar cuaderno</button> : <span />}
          <div className="materias-botones">
            <Boton variante="contorno" onClick={onCerrar}>Cancelar</Boton>
            <Boton type="submit" disabled={guardando}>{guardando ? 'Guardando…' : cuaderno ? 'Guardar' : 'Crear cuaderno'}</Boton>
          </div>
        </div>
      </form>
    </div>
  );
}
