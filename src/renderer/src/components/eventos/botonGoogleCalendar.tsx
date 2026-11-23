import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { EstadoCalendarioGoogle } from '../../types/calendarioGoogle';
import { usarAvisos } from '../../hooks/usarAvisos';
import { extraerMensajeError } from '../../pages/sesionesEstudio/utilidades';

const hora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('es-AR', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'todavía no';

interface BotonGoogleCalendarProps {
  onEstado?: (estado: EstadoCalendarioGoogle) => void; // para marcar en el calendario lo que se movió desde Google
  onSincronizado?: () => void; // se trajeron cambios de Google: hay que recargar los eventos
}

// En la pantalla del calendario: sincroniza ahora con Google Calendar, o conecta la cuenta si todavía no está.
// Lo mismo que en Ajustes > Google Calendar.
export function BotonGoogleCalendar({ onEstado, onSincronizado }: BotonGoogleCalendarProps) {
  const avisos = usarAvisos();
  const [estado, setEstadoLocal] = useState<EstadoCalendarioGoogle | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  const setEstado = (nuevo: EstadoCalendarioGoogle) => {
    setEstadoLocal(nuevo);
    onEstado?.(nuevo);
  };

  useEffect(() => {
    window.api.estadoCalendarioGoogle().then(setEstado).catch(() => setEstadoLocal(null));
  }, []);

  if (!estado) return null;
  const conectado = estado.conectado && !estado.reconectar;

  async function alTocar() {
    setTrabajando(true);
    try {
      const nuevo = conectado ? await window.api.sincronizarCalendarioGoogle() : await window.api.conectarCalendarioGoogle();
      setEstado(nuevo);
      // Lo que se trajo de Google en esta sincronización.
      const traidos = nuevo.ultimosCambios.filter((c) => c.cuando === nuevo.ultimaSincronizacion);
      if (traidos.length > 0) {
        avisos.exito(`Se ${traidos.length === 1 ? 'trajo 1 cambio' : `trajeron ${traidos.length} cambios`} de Google: ${traidos.map((c) => c.titulo).join(', ')}.`);
        onSincronizado?.();
      } else {
        avisos.exito(conectado ? 'Sincronizado con Google Calendar.' : 'Listo: tu calendario "Syntra" ya está en Google Calendar.');
      }
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
