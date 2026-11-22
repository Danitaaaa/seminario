import { FormEvent, useEffect, useState } from 'react';
import { Boton } from '../comunes/boton';
import { obtenerUsuarioId } from '../../../lib/sesion';
import type { CuatrimestreCursada, OpcionMateria } from '../../types/materias';
import type { DatosCuaderno, ResumenCuaderno } from '../../types/cuadernos';
import { cuatrimestreActual, rangoCuatrimestre } from '../../utils/cuatrimestres';
import { NOMBRE_ESTADO } from '../../pages/materias/utilidadesMaterias';

interface ModalCuadernoProps {
  cuaderno?: ResumenCuaderno; // si viene, se edita
  cuentaPara?: number[]; // al editar: las otras materias para las que vale
  usadas: { idMateria: number; idCuatrimestre: number | null }[]; // cursadas que ya tienen cuaderno
  onGuardar: (datos: DatosCuaderno) => Promise<boolean>;
  onEliminar?: () => void;
  onCerrar: () => void;
}

const normalizar = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

// Crear o editar un cuaderno: la materia, en qué cuatrimestre se cursa y el nombre.
// Hay un cuaderno por cada vez que se cursa la materia.
export function ModalCuaderno({ cuaderno, cuentaPara, usadas, onGuardar, onEliminar, onCerrar }: ModalCuadernoProps) {
  const [materias, setMaterias] = useState<OpcionMateria[] | null>(null);
  const [cuatris, setCuatris] = useState<CuatrimestreCursada[]>([]);
  const [nombre, setNombre] = useState(cuaderno?.nombre ?? '');
  const [idMateria, setIdMateria] = useState<number | ''>(cuaderno?.materia.idMateria ?? '');
  const [idCuatri, setIdCuatri] = useState<string>(cuaderno ? String(cuaderno.cuatrimestre?.idCuatrimestre ?? '') : '');
  const [extra, setExtra] = useState<number[]>(cuentaPara ?? []);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    window.api.listarMateriasUsuario({ usuarioId: obtenerUsuarioId() ?? 0 })
      .then(setMaterias)
      .catch(() => setMaterias([]));
    window.api.listarCuatrimestres({ usuarioId: obtenerUsuarioId() ?? 0 })
      .then((lista) => {
        setCuatris(lista);
        // Uno nuevo va por defecto al cuatrimestre que se está cursando.
        if (!cuaderno) setIdCuatri(String(cuatrimestreActual(lista)?.idCuatrimestre ?? ''));
      })
      .catch(() => setCuatris([]));
  }, []);

  // Se ofrecen las materias sin cuaderno en ese cuatrimestre (y la propia al editar), agrupadas por formación y año.
  const cuatriElegido = idCuatri === '' ? null : Number(idCuatri);
  const ocupada = (id: number) =>
    id !== cuaderno?.materia.idMateria && usadas.some((u) => u.idMateria === id && u.idCuatrimestre === cuatriElegido);
  const disponibles = (materias ?? []).filter((m) => !ocupada(m.idMateria));

  // La misma materia en otra formación (por ejemplo, dos carreras que la comparten).
  const elegida = materias?.find((m) => m.idMateria === idMateria);
  const mismas = elegida
    ? (materias ?? []).filter((m) => m.idMateria !== elegida.idMateria && normalizar(m.nombre) === normalizar(elegida.nombre))
    : [];
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
    setExtra([]);
  }

  async function guardar(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (idMateria === '') return setError('Elegí la materia del cuaderno.');
    if (!nombre.trim()) return setError('Ponele un nombre al cuaderno.');
    setGuardando(true);
    setError('');
    const ok = await onGuardar({
      nombre: nombre.trim(),
      idMateria,
      idCuatrimestre: cuatriElegido,
      materiasExtra: extra.filter((id) => mismas.some((m) => m.idMateria === id)),
    });
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
          <p className="materias-ayuda">Todas tus materias ya tienen cuaderno en ese cuatrimestre. Cargá más materias desde Materias.</p>
        )}

        <label className="materias-campo">Cuatrimestre
          <select value={idCuatri} onChange={(e) => setIdCuatri(e.target.value)}>
            <option value="">Sin cuatrimestre</option>
            {cuatris.map((c) => (
              <option key={c.idCuatrimestre} value={c.idCuatrimestre}>{c.nombre} · {rangoCuatrimestre(c)}</option>
            ))}
          </select>
        </label>

        {mismas.length > 0 && (
          <fieldset className="materias-campo materias-campo--grupo">
            <legend>Cuenta también para</legend>
            {mismas.map((m) => (
              <label key={m.idMateria} className="cuatris-check">
                <input
                  type="checkbox"
                  checked={extra.includes(m.idMateria)}
                  onChange={(e) => setExtra(e.target.checked ? [...extra, m.idMateria] : extra.filter((id) => id !== m.idMateria))}
                />
                {m.nombre} · {m.formacion}
              </label>
            ))}
            <p className="materias-ayuda">Si cursás la misma materia para dos carreras, usás un solo cuaderno para las dos.</p>
          </fieldset>
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
