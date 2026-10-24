import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  EstadoCuentaSpotify,
  EstadoReproduccionSpotify,
  SdkEstadoReproductor,
  SdkReproductor,
} from '../types/spotify';
import { obtenerUsuarioId } from '../../lib/sesion';
import { usarAvisos } from './usarAvisos';
import { usarPreferencia } from './usarPreferencia';
import { extraerMensajeError } from '../pages/sesionesEstudio/utilidades';

const URL_SDK = 'https://sdk.scdn.co/spotify-player.js';
const NOMBRE_DISPOSITIVO = 'Syntra';
const ESPERA_SDK_MS = 10_000;
const INTERVALO_REMOTO_MS = 3_000;

// 'sdk': la música suena dentro de la app (Web Playback SDK, requiere Premium y Widevine).
// 'remoto': la app controla otro dispositivo (Spotify de escritorio o celular) por la Web API.
export type ModoSpotify = 'sdk' | 'remoto';

// Lo que elige el usuario: que la música suene en la app o solo controlar su Spotify abierto.
export type PreferenciaSpotify = 'app' | 'control';

interface SpotifyContexto {
  cuenta: EstadoCuentaSpotify | null;
  modo: ModoSpotify | null;
  estado: EstadoReproduccionSpotify | null;
  // true si lo que suena es el reproductor de la app.
  enEsteDispositivo: boolean;
  guardada: boolean;
  aviso: string | null;
  vinculando: boolean;
  preferencia: PreferenciaSpotify;
  cambiarPreferencia: (preferencia: PreferenciaSpotify) => void;
  activar: () => void;
  vincular: () => Promise<void>;
  desvincular: () => Promise<void>;
  alternar: () => Promise<void>;
  siguiente: () => Promise<void>;
  anterior: () => Promise<void>;
  escucharAca: () => Promise<void>;
}

const Contexto = createContext<SpotifyContexto | null>(null);

// Carga el script del Web Playback SDK una sola vez.
let promesaSdk: Promise<void> | null = null;
function cargarSdk(): Promise<void> {
  if (window.Spotify) return Promise.resolve();
  if (promesaSdk) return promesaSdk;
  promesaSdk = new Promise<void>((resolve, reject) => {
    window.onSpotifyWebPlaybackSDKReady = () => resolve();
    const script = document.createElement('script');
    script.src = URL_SDK;
    script.async = true;
    script.onerror = () => {
      promesaSdk = null;
      reject(new Error('No se pudo cargar el reproductor de Spotify.'));
    };
    document.body.appendChild(script);
  });
  return promesaSdk;
}

// Convierte el estado del SDK al mismo formato que devuelve el main.
function desdeSdk(s: SdkEstadoReproductor, idDispositivo: string | null): EstadoReproduccionSpotify | null {
  const pista = s.track_window.current_track;
  if (!pista) return null;
  return {
    reproduciendo: !s.paused,
    progresoMs: s.position,
    dispositivo: { id: idDispositivo, nombre: NOMBRE_DISPOSITIVO },
    pista: {
      uri: pista.uri,
      nombre: pista.name,
      artistas: pista.artists.map((a) => a.name).join(', '),
      album: pista.album.name,
      imagen: pista.album.images[0]?.url ?? null,
      duracionMs: pista.duration_ms,
      numero: pista.track_number ?? 0,
    },
    contexto: s.context?.metadata?.name && s.context.uri
      ? { uri: s.context.uri, nombre: s.context.metadata.name, subtitulo: 'Spotify' }
      : null,
  };
}

// Reproductor de Spotify de toda la app. Vive arriba de las rutas, así la música sigue
// sonando al pasar de una pantalla a otra. Se activa la primera vez que se muestra la tarjeta.
export function ProveedorSpotify({ children }: { children: ReactNode }) {
  const avisos = usarAvisos();
  const [cuenta, setCuenta] = useState<EstadoCuentaSpotify | null>(null);
  const [modo, setModo] = useState<ModoSpotify | null>(null);
  const [estado, setEstado] = useState<EstadoReproduccionSpotify | null>(null);
  const [enEsteDispositivo, setEnEsteDispositivo] = useState(false);
  const [guardada, setGuardada] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [vinculando, setVinculando] = useState(false);
  // Se recuerda en este equipo (como la vista lista/cuadrícula). Por defecto, en la app.
  const [preferencia, setPreferencia] = usarPreferencia<PreferenciaSpotify>('spotify-modo', 'app');
  const preferenciaRef = useRef(preferencia);
  preferenciaRef.current = preferencia;

  const usuarioRef = useRef<number | null>(null);
  const reproductor = useRef<SdkReproductor | null>(null);
  const idDispositivo = useRef<string | null>(null);
  const activado = useRef(false);

  const usuario = () => usuarioRef.current ?? obtenerUsuarioId() ?? 0;

  // Pide al main qué está sonando en la cuenta (sirve en modo remoto y cuando el SDK no está activo).
  const refrescarRemoto = useCallback(async () => {
    try {
      const actual = await window.api.spotifyEstado(usuario());
      setEstado(actual);
      setEnEsteDispositivo(Boolean(actual?.dispositivo?.id && actual.dispositivo.id === idDispositivo.current));
    } catch {
      // Silencioso: el próximo intento vuelve a probar.
    }
  }, []);

  // Desconecta el reproductor de la app (la música deja de sonar acá).
  const apagarReproductor = useCallback(() => {
    reproductor.current?.disconnect();
    reproductor.current = null;
    idDispositivo.current = null;
    setEnEsteDispositivo(false);
  }, []);

  const iniciarReproductor = useCallback(async () => {
    // "Solo controlar Spotify": no se crea el reproductor, se maneja el Spotify abierto.
    if (preferenciaRef.current === 'control') {
      setModo('remoto');
      setAviso(null);
      void refrescarRemoto();
      return;
    }
    if (reproductor.current) return;
    try {
      await Promise.race([
        cargarSdk(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ESPERA_SDK_MS)),
      ]);
      if (!window.Spotify) throw new Error('sin sdk');

      const player = new window.Spotify.Player({
        name: NOMBRE_DISPOSITIVO,
        volume: 0.6,
        getOAuthToken: (cb) => {
          window.api.spotifyToken(usuario()).then(cb).catch(() => setAviso('La sesión de Spotify venció. Volvé a vincular tu cuenta.'));
        },
      });

      const pasarARemoto = (mensaje: string) => {
        setModo('remoto');
        setAviso(mensaje);
      };
      player.addListener('ready', ({ device_id }) => {
        idDispositivo.current = device_id;
        setModo('sdk');
        setAviso(null);
      });
      player.addListener('not_ready', () => {
        idDispositivo.current = null;
      });
      player.addListener('initialization_error', () =>
        pasarARemoto('Esta versión de la app no puede reproducir audio protegido; se controla tu Spotify abierto.'));
      player.addListener('account_error', () =>
        pasarARemoto('Para escuchar dentro de la app hace falta Spotify Premium.'));
      player.addListener('authentication_error', () => setAviso('Volvé a vincular tu cuenta de Spotify.'));
      player.addListener('playback_error', ({ message }) => setAviso(message));
      player.addListener('player_state_changed', (s) => {
        const convertido = s ? desdeSdk(s, idDispositivo.current) : null;
        setEnEsteDispositivo(convertido !== null);
        if (convertido) setEstado(convertido);
        else void refrescarRemoto();
      });

      reproductor.current = player;
      const conectado = await player.connect();
      if (!conectado) pasarARemoto('No se pudo iniciar el reproductor; se controla tu Spotify abierto.');
    } catch {
      setModo('remoto');
      setAviso('No se pudo iniciar el reproductor dentro de la app; se controla tu Spotify abierto.');
    }
    void refrescarRemoto();
  }, [refrescarRemoto]);

  const activar = useCallback(() => {
    if (activado.current) return;
    const id = obtenerUsuarioId();
    if (!id) return;
    activado.current = true;
    usuarioRef.current = id;
    window.api
      .spotifyEstadoCuenta(id)
      .then((c) => {
        setCuenta(c);
        if (c.vinculada) void iniciarReproductor();
      })
      .catch(() => {
        activado.current = false;
        setCuenta({ configurado: false, vinculada: false });
      });
  }, [iniciarReproductor]);

  // En modo remoto (o con el SDK sin reproducir) se consulta cada pocos segundos.
  useEffect(() => {
    if (!cuenta?.vinculada || modo === null || enEsteDispositivo) return;
    const id = window.setInterval(() => void refrescarRemoto(), INTERVALO_REMOTO_MS);
    return () => window.clearInterval(id);
  }, [cuenta?.vinculada, modo, enEsteDispositivo, refrescarRemoto]);

  // "Guardado en Spotify" para la pista actual.
  const uriPista = estado?.pista?.uri ?? null;
  useEffect(() => {
    if (!uriPista) return setGuardada(false);
    let activo = true;
    window.api.spotifyEstaGuardada(usuario(), uriPista).then((g) => activo && setGuardada(g)).catch(() => activo && setGuardada(false));
    return () => {
      activo = false;
    };
  }, [uriPista]);

  useEffect(() => () => reproductor.current?.disconnect(), []);

  // Ejecuta una acción mostrando el error como cartel si falla.
  const intentar = useCallback(async (accion: () => Promise<unknown>, generico: string) => {
    try {
      await accion();
      if (!enEsteDispositivo) window.setTimeout(() => void refrescarRemoto(), 400);
    } catch (e) {
      avisos.error(extraerMensajeError(e, generico));
    }
  }, [avisos, enEsteDispositivo, refrescarRemoto]);

  const escucharAca = useCallback(async () => {
    const id = idDispositivo.current;
    if (!id) return;
    await intentar(async () => {
      await reproductor.current?.activateElement();
      await window.api.spotifyTransferir(usuario(), id, true);
    }, 'No se pudo pasar la música a la app.');
  }, [intentar]);

  const alternar = useCallback(async () => {
    const player = reproductor.current;
    if (enEsteDispositivo && player) {
      await player.activateElement();
      return intentar(() => player.togglePlay(), 'No se pudo pausar o reproducir.');
    }
    if (estado?.reproduciendo) return intentar(() => window.api.spotifyPausar(usuario()), 'No se pudo pausar.');
    // Nada sonando: si el reproductor de la app está listo, la música arranca acá.
    if (modo === 'sdk' && idDispositivo.current) return escucharAca();
    return intentar(() => window.api.spotifyReproducir(usuario()), 'No se pudo reproducir.');
  }, [enEsteDispositivo, estado?.reproduciendo, modo, intentar, escucharAca]);

  const siguiente = useCallback(async () => {
    const player = reproductor.current;
    if (enEsteDispositivo && player) return intentar(() => player.nextTrack(), 'No se pudo pasar de canción.');
    return intentar(() => window.api.spotifySiguiente(usuario()), 'No se pudo pasar de canción.');
  }, [enEsteDispositivo, intentar]);

  const anterior = useCallback(async () => {
    const player = reproductor.current;
    if (enEsteDispositivo && player) return intentar(() => player.previousTrack(), 'No se pudo volver a la canción anterior.');
    return intentar(() => window.api.spotifyAnterior(usuario()), 'No se pudo volver a la canción anterior.');
  }, [enEsteDispositivo, intentar]);

  const vincular = useCallback(async () => {
    setVinculando(true);
    try {
      await window.api.spotifyVincular(usuario());
      setCuenta({ configurado: true, vinculada: true });
      avisos.exito('Se conectó tu cuenta de Spotify.');
      void iniciarReproductor();
    } catch (e) {
      avisos.error(extraerMensajeError(e, 'No se pudo conectar Spotify.'));
    } finally {
      setVinculando(false);
    }
  }, [avisos, iniciarReproductor]);

  const cambiarPreferencia = useCallback((nueva: PreferenciaSpotify) => {
    if (nueva === preferenciaRef.current) return;
    preferenciaRef.current = nueva;
    setPreferencia(nueva);
    if (nueva === 'control') {
      const sonabaAca = enEsteDispositivo;
      apagarReproductor();
      setModo('remoto');
      setAviso(null);
      void refrescarRemoto();
      avisos.info(sonabaAca
        ? 'La música dejó de sonar en la app. Ahora la app controla tu Spotify abierto.'
        : 'Ahora la app controla tu Spotify abierto.');
    } else {
      avisos.info('La música va a sonar dentro de la app.');
      if (cuenta?.vinculada) void iniciarReproductor();
    }
  }, [enEsteDispositivo, apagarReproductor, refrescarRemoto, avisos, cuenta?.vinculada, iniciarReproductor, setPreferencia]);

  const desvincular = useCallback(async () => {
    try {
      apagarReproductor();
      await window.api.spotifyDesvincular(usuario());
      setCuenta((c) => (c ? { ...c, vinculada: false } : c));
      setModo(null);
      setEstado(null);
      setEnEsteDispositivo(false);
      avisos.exito('Se desconectó tu cuenta de Spotify.');
    } catch (e) {
      avisos.error(extraerMensajeError(e, 'No se pudo desconectar Spotify.'));
    }
  }, [avisos]);

  const valor = useMemo<SpotifyContexto>(
    () => ({
      cuenta, modo, estado, enEsteDispositivo, guardada, aviso, vinculando, preferencia, cambiarPreferencia,
      activar, vincular, desvincular, alternar, siguiente, anterior, escucharAca,
    }),
    [cuenta, modo, estado, enEsteDispositivo, guardada, aviso, vinculando, preferencia, cambiarPreferencia,
      activar, vincular, desvincular, alternar, siguiente, anterior, escucharAca]
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function usarSpotify(): SpotifyContexto {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('usarSpotify debe usarse dentro de ProveedorSpotify.');
  return contexto;
}
