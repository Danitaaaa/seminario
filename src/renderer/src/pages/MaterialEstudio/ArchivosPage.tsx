import { useEffect, useState } from 'react';
import { Archivo } from '../../types/archivo';
import '../../estilos/Archivos.css';

type Props = {
  nodoPadreId?: number | null;
  onSubido?: () => void;
};

export function ArchivosPage({ nodoPadreId = null, onSubido }: Props) {
  const [seleccionado, setSeleccionado] = useState<{
    nombre: string; extension: string; rutaFisica: string; tamanio: number;
  } | null>(null);
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nombreEditado, setNombreEditado] = useState('');
  const [seleccionadosIds, setSeleccionadosIds] = useState<number[]>([]);
  const [carpetas, setCarpetas] = useState<{ id: number; nombre: string }[]>([]);
  const [carpetaDestino, setCarpetaDestino] = useState<string>('');

  async function cargarArchivos() {
    setArchivos(await window.api.listarArchivos());
  }
  async function cargarCarpetas() {
    setCarpetas(await window.api.listarCarpetas());
  }

  useEffect(() => {
    cargarArchivos();
    cargarCarpetas();
  }, []);

  async function elegirArchivo() {
    const elegido = await window.api.seleccionarArchivo();
    if (elegido) setSeleccionado(elegido);
  }

  async function subir() {
    if (!seleccionado) return;
    await window.api.crearArchivo({
      ...seleccionado, nodoPadreId, usuarioId: USUARIO_ID_PRUEBA, proyectoId: null,
    });
    setSeleccionado(null);
    await cargarArchivos();
    onSubido?.();
  }

  function empezarEdicion(archivo: Archivo) {
    setEditandoId(archivo.id);
    setNombreEditado(archivo.nombre);
  }

  async function guardarEdicion(id: number) {
    if (!nombreEditado.trim()) return;
    if (!confirm('¿Guardar el nuevo nombre?')) return;
    await window.api.modificarArchivo({ id, nombre: nombreEditado });
    setEditandoId(null);
    await cargarArchivos();
  }

  async function eliminar(id: number) {
    if (!confirm('¿Eliminar este archivo? No se puede deshacer.')) return;
    await window.api.eliminarArchivo({ id });
    await cargarArchivos();
  }

  function alternarSeleccion(id: number) {
    setSeleccionadosIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function moverSeleccionados() {
    if (seleccionadosIds.length === 0) return;
    const carpetaId = carpetaDestino ? Number(carpetaDestino) : null;
    if (!confirm(`¿Mover ${seleccionadosIds.length} archivo(s) a la carpeta elegida?`)) return;
    await window.api.moverArchivos({ ids: seleccionadosIds, carpetaId });
    setSeleccionadosIds([]);
    await cargarArchivos();
  }

  return (
    <div className="archivos-page">
      <h2>Subir archivo</h2>
      <div className="archivos-dropzone">
        <span>{seleccionado ? `${seleccionado.nombre}.${seleccionado.extension}` : 'Ningún archivo elegido'}</span>
        <button className="archivos-boton-secundario" onClick={elegirArchivo}>Elegir archivo</button>
        {seleccionado && <button className="archivos-boton" onClick={subir}>Subir</button>}
      </div>

      <h2>Mis archivos</h2>

      {seleccionadosIds.length > 0 && (
        <div className="archivos-mover-barra">
          <span>{seleccionadosIds.length} seleccionado(s)</span>
          <select value={carpetaDestino} onChange={(e) => setCarpetaDestino(e.target.value)}>
            <option value="">Raíz (sin carpeta)</option>
            {carpetas.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          <button className="archivos-boton" onClick={moverSeleccionados}>Mover</button>
        </div>
      )}

      <ul className="archivos-lista">
        {archivos.map((a) => (
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
                <span className="archivos-item-info">{a.nombre}.{a.extension} — {a.tamanio} bytes</span>
                <div className="archivos-item-acciones">
                  <button className="archivos-boton-secundario" onClick={() => empezarEdicion(a)}>Editar</button>
                  <button className="archivos-boton-peligro" onClick={() => eliminar(a.id)}>Eliminar</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}