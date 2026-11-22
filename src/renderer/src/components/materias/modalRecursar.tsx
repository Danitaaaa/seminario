import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Boton } from '../comunes/boton';
import type { CuatrimestreCursada, MateriaFormacion } from '../../types/materias';
import { cuatrimestreActual, momentoDe, rangoCuatrimestre } from '../../utils/cuatrimestres';
import { mensajeDeError } from '../../pages/materias/utilidadesMaterias';

interface ModalRecursarProps {
  usuarioId: number;
  materia: MateriaFormacion;
  onCerrar: () => void;
  onRecursada: (idCuaderno: number) => void;
  onCrearCuatrimestre: () => void; // si no hay ninguno cargado
}

// Volver a cursar una materia libre: pasa a "Cursando" con un cuaderno nuevo para esa cursada.
export function ModalRecursar({ usuarioId, materia, onCerrar, onRecursada, onCrearCuatrimestre }: ModalRecursarProps) {
  const [cuatris, setCuatris] = useState<CuatrimestreCursada[] | null>(null);
  const [elegido, setElegido] = useState('');
  const [copiarHorarios, setCopiarHorarios] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    window.api.listarCuatrimestres({ usuarioId })
      .then((lista) => {
        // Los que ya terminaron no tienen sentido para recursar.
        const vigentes = lista.filter((c) => momentoDe(c) !== 'terminado');
        setCuatris(vigentes);
        const actual = cuatrimestreActual(vigentes);
        if (actual) setElegido(String(actual.idCuatrimestre));
      })
      .catch((e) => setError(mensajeDeError(e, 'No se pudieron cargar tus cuatrimestres.')));
  }, []);

  async function recursar(): Promise<void> {
    setGuardando(true);
    setError('');
    try {
      const { idCuaderno } = await window.api.recursarMateria({
        usuarioId, idMateria: materia.idMateria, idCuatrimestre: Number(elegido), copiarHorarios,
      });
      onRecursada(idCuaderno);
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo recursar la materia.'));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="materias-fondo-modal" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="materias-modal" role="dialog" aria-modal="true" aria-labelledby="titulo-recursar">
        <div className="materias-modal__cabecera">
          <div>
            <h2 id="titulo-recursar">Recursar {materia.nombre}</h2>
            <p>Se crea un cuaderno nuevo para esta cursada. Los cuadernos de las veces anteriores quedan guardados con sus notas.</p>
          </div>
          <button type="button" className="materias-icono" aria-label="Cerrar" onClick={onCerrar}><X size={20} /></button>
        </div>

        {cuatris && cuatris.length === 0 ? (
          <>
            <p>Primero cargá el cuatrimestre en el que la vas a cursar, con sus fechas.</p>
            <div className="materias-acciones">
              <Boton variante="contorno" onClick={onCerrar}>Cancelar</Boton>
              <Boton onClick={onCrearCuatrimestre}>Cargar cuatrimestre</Boton>
            </div>
          </>
        ) : (
          <>
            <label className="materias-campo">Cuatrimestre
              <select value={elegido} onChange={(e) => setElegido(e.target.value)}>
                {cuatris?.map((c) => (
                  <option key={c.idCuatrimestre} value={c.idCuatrimestre}>{c.nombre} · {rangoCuatrimestre(c)}</option>
                ))}
              </select>
            </label>
            <label className="cuatris-check">
              <input type="checkbox" checked={copiarHorarios} onChange={(e) => setCopiarHorarios(e.target.checked)} />
              Copiar el horario de la última vez que la cursé
            </label>
            {error && <p className="materias-error" role="alert">{error}</p>}
            <div className="materias-acciones">
              <Boton variante="contorno" onClick={onCerrar}>Cancelar</Boton>
              <Boton onClick={() => void recursar()} disabled={guardando || !elegido}>{guardando ? 'Guardando…' : 'Recursar'}</Boton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
