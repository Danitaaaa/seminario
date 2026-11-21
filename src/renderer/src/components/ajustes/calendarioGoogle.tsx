import { useEffect, useState } from 'react';
import { CalendarCheck, RefreshCw } from 'lucide-react';
import type { EstadoCalendarioGoogle } from '../../types/calendarioGoogle';
import { extraerMensajeError } from '../../pages/sesionesEstudio/utilidades';

const cuando = (iso: string | null) => {
  if (!iso) return 'todavía no';
  const f = new Date(iso);
  const hoy = new Date().toDateString() === f.toDateString();
  return `${hoy ? 'hoy' : f.toLocaleDateString('es-AR')} a las ${f.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
};

// Ajustes > Google Calendar: copia los eventos, parciales, sesiones, clases y metas de Syntra
// a un calendario "Syntra" en la cuenta de Google (solo de Syntra hacia Google).
export function AjustesCalendarioGoogle() {
  const [estado, setEstado] = useState<EstadoCalendarioGoogle | null>(null);
  const [trabajando, setTrabajando] = useState<'conectar' | 'sincronizar' | 'desconectar' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    window.api.estadoCalendarioGoogle().then(setEstado).catch(() => setEstado(null));
  }, []);

  async function hacer(accion: 'conectar' | 'sincronizar' | 'desconectar', llamada: () => Promise<EstadoCalendarioGoogle>) {
    setTrabajando(accion);
    setError('');
    try {
      setEstado(await llamada());
    } catch (e) {
      setError(extraerMensajeError(e, 'No se pudo completar con Google Calendar.'));
    } finally {
      setTrabajando(null);
    }
  }

  const conectado = estado?.conectado && !estado.reconectar;

  return (
    <section className="ajustes__seccion">
      <h3 className="ajustes__titulo">Google Calendar</h3>
      <p className="ajustes__ayuda">
        Copia tus eventos, parciales, sesiones de estudio, clases y metas a un calendario "Syntra" en tu Google Calendar,
        así los ves en el celular. Se actualiza solo cada 15 minutos. Los cambios se hacen en Syntra: lo que edites en Google se pisa.
      </p>

      {conectado ? (
        <>
          <p className="ajustes__calendario-estado">
            <CalendarCheck size={16} aria-hidden="true" />
            Conectado{estado?.correo ? ` con ${estado.correo}` : ''} · última copia: {cuando(estado?.ultimaSincronizacion ?? null)}
          </p>
          <div className="ajustes__calendario-acciones">
            <button
              type="button"
              className="ajustes__boton"
              disabled={trabajando !== null}
              onClick={() => void hacer('sincronizar', () => window.api.sincronizarCalendarioGoogle())}
            >
              <RefreshCw size={14} aria-hidden="true" className={trabajando === 'sincronizar' ? 'ajustes__girando' : undefined} />
              {trabajando === 'sincronizar' ? 'Copiando…' : 'Sincronizar ahora'}
            </button>
            <button
              type="button"
              className="ajustes__boton ajustes__boton--secundario"
              disabled={trabajando !== null}
              onClick={() => void hacer('desconectar', () => window.api.desconectarCalendarioGoogle())}
              title='Borra el calendario "Syntra" de tu Google y olvida el permiso en esta compu'
            >
              {trabajando === 'desconectar' ? 'Desconectando…' : 'Desconectar'}
            </button>
          </div>
        </>
      ) : (
        <div className="ajustes__calendario-acciones">
          {estado?.reconectar && <p className="ajustes__error">El permiso de Google venció. Conectá de nuevo para seguir copiando.</p>}
          <button
            type="button"
            className="ajustes__boton"
            disabled={trabajando !== null}
            onClick={() => void hacer('conectar', () => window.api.conectarCalendarioGoogle())}
          >
            {trabajando === 'conectar' ? 'Esperando a Google…' : estado?.reconectar ? 'Conectar de nuevo' : 'Conectar con Google Calendar'}
          </button>
          {trabajando === 'conectar' && (
            <button type="button" className="ajustes__boton ajustes__boton--secundario" onClick={() => void window.api.cancelarCalendarioGoogle()}>
              Cancelar
            </button>
          )}
        </div>
      )}
      {error && <p className="ajustes__error">{error}</p>}
    </section>
  );
}
