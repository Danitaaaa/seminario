import { useEffect, useState } from 'react';
import { CalendarCheck, RefreshCw } from 'lucide-react';
import type { CalendarioVisible, EstadoCalendarioGoogle } from '../../types/calendarioGoogle';
import { extraerMensajeError } from '../../pages/sesionesEstudio/utilidades';

const cuando = (iso: string | null) => {
  if (!iso) return 'todavía no';
  const f = new Date(iso);
  const hoy = new Date().toDateString() === f.toDateString();
  return `${hoy ? 'hoy' : f.toLocaleDateString('es-AR')} a las ${f.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
};

type Accion = 'conectar' | 'sincronizar' | 'desconectar' | 'configurar' | 'lectura' | 'elegir';

// Ajustes > Google Calendar: copia los eventos, parciales, sesiones, clases y metas de Syntra
// a un calendario "Syntra" en la cuenta de Google, trae lo que se edite allá y deja ver otros calendarios.
export function AjustesCalendarioGoogle() {
  const [estado, setEstado] = useState<EstadoCalendarioGoogle | null>(null);
  const [trabajando, setTrabajando] = useState<Accion | null>(null);
  const [error, setError] = useState('');
  const [calendarios, setCalendarios] = useState<CalendarioVisible[] | null>(null);

  useEffect(() => {
    window.api.estadoCalendarioGoogle().then(setEstado).catch(() => setEstado(null));
  }, []);

  // Con permiso de lectura, se listan los calendarios de la cuenta para elegir cuáles ver.
  useEffect(() => {
    if (!estado?.conectado || !estado.verOtros) return;
    window.api.listarCalendariosGoogle()
      .then(setCalendarios)
      .catch((e) => setError(extraerMensajeError(e, 'No se pudieron leer tus calendarios de Google.')));
  }, [estado?.conectado, estado?.verOtros]);

  const visibles = new Set(estado?.calendariosVisibles.map((c) => c.id) ?? []);
  const alternarCalendario = (id: string) => {
    const ids = visibles.has(id) ? [...visibles].filter((v) => v !== id) : [...visibles, id];
    void hacer('elegir', () => window.api.elegirCalendariosGoogle({ ids }));
  };

  async function hacer(accion: Accion, llamada: () => Promise<EstadoCalendarioGoogle>) {
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
        así los ves en el celular. Se actualiza solo cada 15 minutos.
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

          <label className="ajustes__calendario-opcion">
            <input
              type="checkbox"
              checked={estado?.traerCambios ?? true}
              disabled={trabajando !== null}
              onChange={(e) => void hacer('configurar', () => window.api.configurarCalendarioGoogle({ traerCambios: e.target.checked }))}
            />
            <span>
              Traer los cambios que hagas en Google
              <small>
                Si movés un evento o una sesión de estudio desde el celular, se actualiza en Syntra. Las clases y las metas se
                cambian en Syntra. Si algo se borra en Google, Syntra lo vuelve a poner.
              </small>
            </span>
          </label>

          <h4 className="ajustes__subtitulo">Ver otros calendarios en Syntra</h4>
          {estado?.verOtros ? (
            <>
              <p className="ajustes__ayuda">Se ven en tu Calendario de Syntra pero se editan desde Google.</p>
              {calendarios === null && <p className="ajustes__ayuda">Cargando tus calendarios…</p>}
              {calendarios?.length === 0 && <p className="ajustes__ayuda">No tenés otros calendarios en esta cuenta.</p>}
              <div className="ajustes__calendarios">
                {calendarios?.map((c) => (
                  <label key={c.id} className="ajustes__calendario-opcion ajustes__calendario-opcion--fila">
                    <input type="checkbox" checked={visibles.has(c.id)} disabled={trabajando !== null} onChange={() => alternarCalendario(c.id)} />
                    <span className="ajustes__calendario-color" style={{ background: c.color ?? 'var(--color-steel)' }} aria-hidden="true" />
                    {c.nombre}
                  </label>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="ajustes__ayuda">
                Para ver en Syntra los eventos de tus otros calendarios (por ejemplo, el personal), Google te va a pedir
                permiso para leerlos. Syntra no puede cambiarlos.
              </p>
              <button
                type="button"
                className="ajustes__boton ajustes__boton--secundario"
                disabled={trabajando !== null}
                onClick={() => void hacer('lectura', () => window.api.permitirLecturaCalendarioGoogle())}
              >
                {trabajando === 'lectura' ? 'Esperando a Google…' : 'Ver otros calendarios'}
              </button>
            </>
          )}
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
