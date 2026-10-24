import { useEffect, useRef, useState } from 'react';
import { Check, CheckCircle2, Infinity as InfinitoIcono, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { usarSpotify } from '../../hooks/usarSpotify';
import { formatearTiempo } from '../../pages/sesionesEstudio/utilidades';
import '../../styles/spotify.css';

// Tarjeta de Spotify del panel de la sesión: carátula, playlist o álbum, "Guardado en Spotify",
// anterior / play-pausa / siguiente y la canción actual con su duración.
export function ReproductorSpotify() {
  const spotify = usarSpotify();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const progreso = usarProgreso(spotify.estado?.progresoMs ?? 0, spotify.estado?.reproduciendo ?? false, spotify.estado?.pista?.uri);

  useEffect(() => {
    spotify.activar();
  }, [spotify.activar]);

  const { cuenta } = spotify;

  if (!cuenta) {
    return <div className="spotify spotify--mensaje"><p className="spotify__texto-suave">Cargando Spotify…</p></div>;
  }

  if (!cuenta.configurado) {
    return (
      <div className="spotify spotify--mensaje">
        <p className="spotify__titulo-mensaje">Spotify no está configurado</p>
        <p className="spotify__texto-suave">Agregá SPOTIFY_CLIENT_ID en el archivo .env y reiniciá la app.</p>
      </div>
    );
  }

  if (!cuenta.vinculada) {
    return (
      <div className="spotify spotify--mensaje">
        <p className="spotify__titulo-mensaje">Escuchá música mientras estudiás</p>
        <p className="spotify__texto-suave">Conectá tu cuenta para controlar Spotify desde la sesión.</p>
        <button type="button" className="spotify__conectar" disabled={spotify.vinculando} onClick={() => void spotify.vincular()}>
          {spotify.vinculando ? 'Esperando el navegador…' : 'Conectar con Spotify'}
        </button>
      </div>
    );
  }

  const { estado } = spotify;
  const pista = estado?.pista ?? null;
  const titulo = estado?.contexto?.nombre ?? pista?.album ?? 'Nada sonando';
  const subtitulo = estado?.contexto?.subtitulo ?? (pista ? pista.artistas : 'Spotify');
  const otroDispositivo = estado?.dispositivo && !spotify.enEsteDispositivo ? estado.dispositivo.nombre : null;
  const duracion = pista?.duracionMs ?? 0;

  return (
    <div className="spotify">
      <div className="spotify__superior">
        <span className="spotify__modo">
          <span
            className={`spotify__punto${estado?.reproduciendo ? ' spotify__punto--activo' : ''}`}
            title={spotify.enEsteDispositivo ? 'Sonando en la app' : otroDispositivo ? `Sonando en ${otroDispositivo}` : 'Sin reproducir'}
          />
          {spotify.enEsteDispositivo
            ? 'Sonando en la app'
            : otroDispositivo
              ? `Sonando en ${otroDispositivo}`
              : spotify.preferencia === 'control' || spotify.modo === 'remoto'
                ? 'Controlando Spotify'
                : 'Lista para sonar en la app'}
        </span>
        <div className="spotify__menu-contenedor">
          <button
            type="button"
            className="spotify__opciones"
            aria-label="Opciones de Spotify"
            aria-expanded={menuAbierto}
            onClick={() => setMenuAbierto((v) => !v)}
          />
          {menuAbierto && (
            <div className="spotify__menu" role="menu">
              <span className="spotify__menu-titulo">¿Dónde suena la música?</span>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={spotify.preferencia === 'app'}
                className="spotify__menu-opcion"
                onClick={() => { setMenuAbierto(false); spotify.cambiarPreferencia('app'); }}
              >
                <span className="spotify__menu-marca">{spotify.preferencia === 'app' && <Check size={14} />}</span>
                Reproducir en la app
              </button>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={spotify.preferencia === 'control'}
                className="spotify__menu-opcion"
                onClick={() => { setMenuAbierto(false); spotify.cambiarPreferencia('control'); }}
              >
                <span className="spotify__menu-marca">{spotify.preferencia === 'control' && <Check size={14} />}</span>
                Solo controlar Spotify
              </button>
              <span className="spotify__menu-separador" />
              <button
                type="button"
                role="menuitem"
                className="spotify__menu-opcion spotify__menu-opcion--peligro"
                onClick={() => { setMenuAbierto(false); void spotify.desvincular(); }}
              >
                <span className="spotify__menu-marca" />
                Desconectar Spotify
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="spotify__info">
        {pista?.imagen ? (
          <img className="spotify__caratula" src={pista.imagen} alt="" />
        ) : (
          <div className="spotify__caratula spotify__caratula--vacia" aria-hidden="true">
            <InfinitoIcono size={22} />
          </div>
        )}
        <div className="spotify__textos">
          <span className="spotify__titulo" title={titulo}>{titulo}</span>
          <span className="spotify__subtitulo" title={subtitulo}>{subtitulo}</span>
        </div>
      </div>

      {pista && spotify.guardada && (
        <div className="spotify__guardado">
          <CheckCircle2 size={15} aria-hidden="true" /> Guardado en Spotify
        </div>
      )}

      <div className="spotify__controles">
        <button type="button" className="spotify__control" aria-label="Anterior" onClick={() => void spotify.anterior()}>
          <SkipBack size={14} fill="currentColor" />
        </button>
        <button
          type="button"
          className="spotify__play"
          aria-label={estado?.reproduciendo ? 'Pausar' : 'Reproducir'}
          onClick={() => void spotify.alternar()}
        >
          {estado?.reproduciendo ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
        </button>
        <button type="button" className="spotify__control" aria-label="Siguiente" onClick={() => void spotify.siguiente()}>
          <SkipForward size={14} fill="currentColor" />
        </button>
      </div>

      <div className="spotify__progreso" aria-hidden="true">
        <div className="spotify__progreso-relleno" style={{ width: duracion ? `${Math.min(100, (progreso / duracion) * 100)}%` : '0%' }} />
      </div>

      <div className="spotify__pie">
        <span className="spotify__pista" title={pista ? `${pista.nombre} · ${pista.artistas}` : undefined}>
          {pista ? `${pista.numero ? `${pista.numero}. ` : ''}${pista.nombre}` : 'Elegí algo en Spotify y tocá play'}
        </span>
        {pista && <span className="spotify__duracion">{formatearTiempo(duracion / 1000)}</span>}
      </div>

      {otroDispositivo && spotify.modo === 'sdk' && (
        <button type="button" className="spotify__escuchar-aca" onClick={() => void spotify.escucharAca()}>
          Sonando en {otroDispositivo} · Escuchar acá
        </button>
      )}
      {spotify.aviso && <p className="spotify__aviso">{spotify.aviso}</p>}
    </div>
  );
}

// Avanza la posición localmente entre actualizaciones (el SDK solo avisa cuando cambia algo).
function usarProgreso(progresoMs: number, reproduciendo: boolean, uri: string | undefined): number {
  const [actual, setActual] = useState(progresoMs);
  const base = useRef({ ms: progresoMs, desde: Date.now() });

  useEffect(() => {
    base.current = { ms: progresoMs, desde: Date.now() };
    setActual(progresoMs);
  }, [progresoMs, uri]);

  useEffect(() => {
    if (!reproduciendo) return;
    const id = window.setInterval(() => setActual(base.current.ms + (Date.now() - base.current.desde)), 1000);
    return () => window.clearInterval(id);
  }, [reproduciendo]);

  return actual;
}
