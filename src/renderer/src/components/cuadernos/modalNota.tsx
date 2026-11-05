import { FormEvent, useState } from 'react';
import { Boton } from '../comunes/boton';
import type { DatosNota, EstadoNota, Nota, TipoNota } from '../../types/cuadernos';
import { ESTADOS_NOTA, NOMBRE_ESTADO_NOTA, TIPOS_NOTA, estadoPorNota } from '../../pages/cuadernos/utilidadesCuadernos';

interface ModalNotaProps {
  nota?: Nota; // si viene, se edita
  onGuardar: (datos: DatosNota) => Promise<boolean>;
  onEliminar?: () => void;
  onCerrar: () => void;
}

type EstadoElegido = 'auto' | EstadoNota;

// Cargar o editar una nota. El estado sale de la nota, pero se puede elegir a mano
// (en algunas universidades se aprueba con 4).
export function ModalNota({ nota, onGuardar, onEliminar, onCerrar }: ModalNotaProps) {
  const [tipo, setTipo] = useState<TipoNota>(nota?.tipo ?? 'parcial');
  const [nombre, setNombre] = useState(nota?.nombre ?? '');
  const [fecha, setFecha] = useState(nota?.fecha ?? '');
  const [valor, setValor] = useState(nota?.nota !== null && nota?.nota !== undefined ? String(nota.nota) : '');
  const [estado, setEstado] = useState<EstadoElegido>(nota && nota.estado !== estadoPorNota(nota.nota) ? nota.estado : 'auto');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const numero = valor.trim() === '' ? null : Number(valor.replace(',', '.'));
  const automatico = estadoPorNota(numero !== null && !Number.isNaN(numero) ? numero : null);

  async function guardar(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!nombre.trim()) return setError('Poné un nombre, por ejemplo "Parcial 1".');
    if (numero !== null && (Number.isNaN(numero) || numero < 0 || numero > 10)) return setError('La nota va de 0 a 10.');
    setGuardando(true);
    setError('');
    const ok = await onGuardar({
      tipo, nombre: nombre.trim(), fecha: fecha || null, nota: numero, estado: estado === 'auto' ? undefined : estado,
    });
    setGuardando(false);
    if (ok) onCerrar();
  }

  return (
    <div className="materias-fondo-modal">
      <form className="materias-modal" role="dialog" aria-modal="true" aria-labelledby="titulo-nota" onSubmit={(e) => void guardar(e)}>
        <h2 id="titulo-nota">{nota ? 'Editar nota' : 'Cargar nota'}</h2>

        <div className="materias-fila">
          <label className="materias-campo">Tipo
            <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoNota)}>
              {TIPOS_NOTA.map((t) => <option key={t.valor} value={t.valor}>{t.nombre}</option>)}
            </select>
          </label>
          <label className="materias-campo">Nombre
            <input value={nombre} maxLength={100} placeholder="Parcial 1" autoFocus onChange={(e) => setNombre(e.target.value)} />
          </label>
        </div>

        <div className="materias-fila">
          <label className="materias-campo">Fecha
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </label>
          <label className="materias-campo">Nota
            <input inputMode="decimal" value={valor} placeholder="Sin nota todavía" onChange={(e) => setValor(e.target.value)} />
          </label>
        </div>

        <label className="materias-campo">Estado
          <select value={estado} onChange={(e) => setEstado(e.target.value as EstadoElegido)}>
            <option value="auto">Según la nota ({NOMBRE_ESTADO_NOTA[automatico].toLowerCase()})</option>
            {ESTADOS_NOTA.map((e) => <option key={e.valor} value={e.valor}>{e.nombre}</option>)}
          </select>
        </label>
        <p className="materias-ayuda">Con 7 o más queda aprobado y con menos de 4, desaprobado. De 4 a 6 queda sin definir: si en tu universidad se aprueba con 4, elegí "Aprobado".</p>

        {error && <p className="materias-error" role="alert">{error}</p>}

        <div className="materias-acciones materias-acciones--separadas">
          {onEliminar ? <button type="button" className="materias-link materias-link--peligro" onClick={onEliminar}>Eliminar nota</button> : <span />}
          <div className="materias-botones">
            <Boton variante="contorno" onClick={onCerrar}>Cancelar</Boton>
            <Boton type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Boton>
          </div>
        </div>
      </form>
    </div>
  );
}
