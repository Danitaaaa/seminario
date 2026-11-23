import { useState } from 'react';
import { FileUp, HardDriveDownload, X } from 'lucide-react';
import type { CopiaEnDrive, OrigenCopia } from '../../types/copiaSeguridad';
import { extraerMensajeError } from '../../pages/sesionesEstudio/utilidades';
import '../../styles/copiaSeguridad.css';

const cuando = (iso: string) =>
  new Date(iso).toLocaleString('es-AR', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const megas = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024 / 1024))} MB`;

interface ModalRestaurarProps {
  desdeInicio: boolean; // en el inicio (compu nueva) o en Ajustes
  onCerrar: () => void;
}

// Restaurar una copia de seguridad: de Google Drive o de un archivo .syntra, con la contraseña con la que se hizo.
// Reemplaza todo lo de esta compu; después Syntra se vuelve a abrir.
export function ModalRestaurar({ desdeInicio, onCerrar }: ModalRestaurarProps) {
  const [copias, setCopias] = useState<CopiaEnDrive[] | null>(null);
  const [origen, setOrigen] = useState<OrigenCopia | null>(null);
  const [archivo, setArchivo] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [trabajando, setTrabajando] = useState<'drive' | 'restaurar' | null>(null);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState('');

  async function traerDeDrive() {
    setTrabajando('drive');
    setError('');
    try {
      const lista = await window.api.copiasEnDrive();
      setCopias(lista);
      setArchivo(null);
      setOrigen(lista[0] ? { drive: lista[0].id } : null);
      if (lista.length === 0) setError('No hay copias de Syntra en ese Google Drive.');
    } catch (e) {
      setError(extraerMensajeError(e, 'No se pudo entrar a Google Drive.'));
    } finally {
      setTrabajando(null);
    }
  }

  async function elegirArchivo() {
    setError('');
    const elegido = await window.api.elegirArchivoCopia().catch(() => null);
    if (!elegido) return;
    setArchivo(elegido.nombre);
    setCopias(null);
    setOrigen({ archivo: true });
  }

  async function restaurar() {
    if (!origen) return setError('Elegí de dónde traer la copia.');
    if (!password) return setError('Escribí la contraseña con la que se hizo la copia.');
    setTrabajando('restaurar');
    setError('');
    try {
      await window.api.restaurarCopia({ origen, password, desdeInicio });
      setListo(true);
    } catch (e) {
      setError(extraerMensajeError(e, 'No se pudo restaurar la copia.'));
    } finally {
      setTrabajando(null);
    }
  }

  return (
    <div className="copia-fondo" onMouseDown={(e) => e.target === e.currentTarget && !trabajando && !listo && onCerrar()}>
      <div className="copia-modal" role="dialog" aria-modal="true" aria-labelledby="titulo-restaurar">
        <div className="copia-modal__cabecera">
          <h2 id="titulo-restaurar">Restaurar copia</h2>
          {!listo && (
            <button type="button" className="copia-icono" aria-label="Cerrar" onClick={onCerrar} disabled={trabajando !== null}>
              <X size={18} />
            </button>
          )}
        </div>

        {listo ? (
          <>
            <p>Listo, se restauró la copia. Syntra se va a volver a abrir para arrancar con tus datos.</p>
            <div className="copia-acciones">
              <button type="button" className="copia-boton" autoFocus onClick={() => void window.api.reiniciarSyntra()}>
                Volver a abrir Syntra
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="copia-ayuda">
              Trae tus materias, cuadernos, notas, horarios y material.
              {!desdeInicio && ' Reemplaza todo lo que hay en esta compu; antes se guarda lo que había, por las dudas.'}
            </p>

            <div className="copia-acciones copia-acciones--izq">
              <button type="button" className="copia-boton copia-boton--secundario" onClick={() => void traerDeDrive()} disabled={trabajando !== null}>
                <HardDriveDownload size={16} aria-hidden="true" /> {trabajando === 'drive' ? 'Esperando a Google…' : 'Traer de Google Drive'}
              </button>
              <button type="button" className="copia-boton copia-boton--secundario" onClick={() => void elegirArchivo()} disabled={trabajando !== null}>
                <FileUp size={16} aria-hidden="true" /> Elegir archivo .syntra
              </button>
            </div>

            {copias && copias.length > 0 && (
              <fieldset className="copia-lista">
                <legend>Copias en tu Google Drive</legend>
                {copias.map((c) => (
                  <label key={c.id} className="copia-opcion">
                    <input
                      type="radio"
                      name="copia"
                      checked={origen !== null && 'drive' in origen && origen.drive === c.id}
                      onChange={() => setOrigen({ drive: c.id })}
                    />
                    {cuando(c.fecha)} · {megas(c.tamanio)}
                  </label>
                ))}
              </fieldset>
            )}
            {archivo && <p className="copia-ayuda">Archivo elegido: {archivo}</p>}

            <label className="copia-campo">
              Contraseña con la que se hizo la copia
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </label>

            {error && <p className="copia-error" role="alert">{error}</p>}

            <div className="copia-acciones">
              <button type="button" className="copia-boton copia-boton--secundario" onClick={onCerrar} disabled={trabajando !== null}>
                Cancelar
              </button>
              <button type="button" className="copia-boton" onClick={() => void restaurar()} disabled={trabajando !== null || !origen}>
                {trabajando === 'restaurar' ? 'Restaurando…' : 'Restaurar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
