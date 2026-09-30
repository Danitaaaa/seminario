import { useCallback, useEffect, useState } from 'react';
import type { Nodo } from '../../types/nodo';
import { CartelError } from '../../componentes/comunes/cartelError';
import '../../estilos/Archivos.css';

type Props = {
  idPadre: number;
  onVolver: () => void;
};

type Elegido = { nombre: string; extension: string; rutaFisica: string; tamanio: number };

const mensaje = (e: unknown, porDefecto: string) => (e instanceof Error ? e.message : porDefecto);

export function ArchivosPage({ idPadre, onVolver }: Props) {
  const [seleccionado, setSeleccionado] = useState<Elegido | null>(null);
  const [archivos, setArchivos] = useState<Nodo[]>([]);
  const [carpetas, setCarpetas] = useState<Nodo[]>([]);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nombreEditado, setNombreEditado] = useState('');
  const [seleccionadosIds, setSeleccionadosIds] = useState<number[]>([]);
  const [carpetaDestino, setCarpetaDestino] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [a, c] = await Promise.all([
        window.api.listarContenido({ idPadre, tipo: 'archivo' }),
        window.api.listarContenido({ idPadre, tipo: 'carpeta' }),
      ]);
      setArchivos(a);
      setCarpetas(c);
    } catch (e) {
      setError(mensaje(e, 'No se pudieron cargar los archivos.'));
    }
  }, [idPadre]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function elegirArchivo() {
    const elegido = await window.api.seleccionarArchivo();
    if (elegido) setSeleccionado(elegido);
  }

  async function subir() {
    if (!seleccionado) return;
    try {
      await window.api.crearArchivo({ ...seleccionado, idPadre });
      setSeleccionado(null);
      await cargar();
    } catch (e) {
      setError(mensaje(e, 'No se pudo subir el archivo.'));
    }
  }

  async function guardarEdicion(id: number) {
    if (!nombreEditado.trim()) return;
    try {
      await window.api.modificarArchivo({ id, nombre: nombreEditado.trim() });
      setEditandoId(null);
      await cargar();
    } catch (e) {
      setError(mensaje(e, 'No se pudo renombrar.'));
    }
  }

  async function eliminar(id: number) {
    if (!confirm('¿Eliminar este archivo? No se puede deshacer.')) return;
    try {
      await window.api.eliminarArchivo({ id });
      await cargar();
    } catch (e) {
      setError(mensaje(e, 'No se pudo eliminar.'));
    }
  }

  function alternarSeleccion(id: number) {
    setSeleccionadosIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function moverSeleccionados() {
    if (seleccionadosIds.length === 0 || !carpetaDestino) return;
    try {
      await window.api.moverArchivos({ ids: seleccionadosIds, idPadre: Number(carpetaDestino) });
      setSeleccionadosIds([]);
      await cargar();
    } catch (e) {
      setError(mensaje(e, 'No se pudieron mover los archivos.'));
    }
  }

  return (
    <div className="archivos-page">
      {error && <CartelError mensaje={error} onCerrar={() => setError(null)} />}

      <button className="archivos-boton-secundario" onClick={onVolver}>← Volver</button>

      <h2>Subir archivo</h2>
      <div className="archivos-dropzone">
        <span>{seleccionado ? `${seleccionado.nombre}.${seleccionado.extension}` : 'Ningún archivo elegido'}</span>
        <button className="archivos-boton-secundario" onClick={elegirArchivo}>Elegir archivo</button>
        {seleccionado && <button className="archivos-boton" onClick={subir}>Subir</button>}
      </div>

      <h2>Archivos en esta carpeta</h2>

      {seleccionadosIds.length > 0 && (
        <div className="archivos-mover-barra">
          <span>{seleccionadosIds.length} seleccionado(s)</span>
          <select value={carpetaDestino} onChange={(e) => setCarpetaDestino(e.target.value)}>
            <option value="">Elegir carpeta…</option>
            {idPadre !== 1 && <option value="1">Raíz</option>}
            {carpetas.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          <button className="archivos-boton" onClick={moverSeleccionados} disabled={!carpetaDestino}>Mover</button>
        </div>
      )}

      <ul className="archivos-lista">
        {archivos.map((a) =>
          a.tipo !== 'archivo' ? null : (
            <li className="archivos-item" key={a.id}>
              <input
                type="checkbox"
                checked={seleccionadosIds.includes(a.id)}
                onChange={() => alternarSeleccion(a.id)}
              />
              {editandoId === a.id ? (
                <>
                  <input value={nombreEditado} onChange={(e) => setNombreEditado(e.target.value)} />
                  <div className="archivos-item-acciones">
                    <button className="archivos-boton" onClick={() => guardarEdicion(a.id)}>Guardar</button>
                    <button className="archivos-boton-secundario" onClick={() => setEditandoId(null)}>Cancelar</button>
                  </div>
                </>
              ) : (
                <>
                  <span className="archivos-item-info">{a.nombre}.{a.extension} — {a.tamaño} bytes</span>
                  <div className="archivos-item-acciones">
                    <button
                      className="archivos-boton-secundario"
                      onClick={() => {
                        setEditandoId(a.id);
                        setNombreEditado(a.nombre);
                      }}
                    >
                      Editar
                    </button>
                    <button className="archivos-boton-peligro" onClick={() => eliminar(a.id)}>Eliminar</button>
                  </div>
                </>
              )}
            </li>
          )
        )}
      </ul>
    </div>
  );
}