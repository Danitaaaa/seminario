import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { EstadoCalendarioGoogle } from '../../types/calendarioGoogle';
import { usarAvisos } from '../../hooks/usarAvisos';
import { extraerMensajeError } from '../../pages/sesionesEstudio/utilidades';

const hora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('es-AR', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'todavía no';

// En la pantalla del calendario: copia ahora a Google Calendar, o conecta la cuenta si todavía no está.
// Lo mismo que en Ajustes > Google Calendar.
export function BotonGoogleCalendar() {
  const avisos = usarAvisos();
  const [estado, setEstado] = useState<EstadoCalendarioGoogle | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  useEffect(() => {
    window.api.estadoCalendarioGoogle().then(setEstado).catch(() => setEstado(null));
  }, []);

  if (!estado) return null;
  const conectado = estado.conectado && !estado.reconectar;

  async function alTocar() {
    setTrabajando(true);
    try {
      const nuevo = conectado ? await window.api.sincronizarCalendarioGoogle() : await window.api.conectarCalendarioGoogle();
      setEstado(nuevo);
      avisos.exito(conectado ? 'Copiado a Google Calendar.' : 'Listo: tu calendario "Syntra" ya está en Google Calendar.');
    } catch (e) {
      avisos.error(extraerMensajeError(e, 'No se pudo copiar a Google Calendar.'));
      window.api.estadoCalendarioGoogle().then(setEstado).catch(() => {});
    } finally {
      setTrabajando(false);
    }
  }

  return (
    <button
      type="button"
      className="eventos-boton-nav eventos-boton-google"
      onClick={() => void alTocar()}
      disabled={trabajando}
      title={conectado ? `Copiar ahora a Google Calendar (última copia: ${hora(estado.ultimaSincronizacion)})` : 'Copiar tus eventos, sesiones y clases a Google Calendar'}
    >
      <RefreshCw size={14} aria-hidden="true" className={trabajando ? 'eventos-girando' : undefined} />
      {trabajando
        ? conectado ? 'Copiando…' : 'Esperando a Google…'
        : conectado ? 'Sincronizar con Google' : estado.reconectar ? 'Reconectar Google' : 'Conectar Google Calendar'}
    </button>
  );
}
