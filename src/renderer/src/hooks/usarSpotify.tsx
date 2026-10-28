import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { EstadoCuentaSpotify, EstadoReproduccionSpotify } from '../types/spotify';
import { obtenerUsuarioId } from '../../lib/sesion';
import { usarAvisos } from './usarAvisos';
import { extraerMensajeError } from '../pages/sesionesEstudio/utilidades';

// Cada cuánto se pregunta qué está sonando en la cuenta.
const INTERVALO_ESTADO_MS = 3_000;

interface SpotifyContexto {
  cuenta: EstadoCuentaSpotify | null;
  estado: EstadoReproduccionSpotify | null;
  guardada: boolean;
  vinculando: boolean;
  activar: () => void;
  vincular: () => Promise<void>;
  desvincular: () => Promise<void>;
  alternar: () => Promise<void>;
  siguiente: () => Promise<void>;
  anterior: () => Promise<void>;
}

const Contexto = createContext<SpotifyContexto | null>(null);

// Control de Spotify para toda la app: la música suena en el Spotify del usuario (PC o celular)
// y la app muestra qué suena y maneja play/pausa, siguiente y anterior por la Web API.
// Vive arriba de las rutas, así el estado no se pierde al cambiar de pantalla.
export function ProveedorSpotify({ children }: { children: ReactNode }) {
  const avisos = usarAvisos();
  const [cuenta, setCuenta] = useState<EstadoCuentaSpotify | null>(null);
  const [estado, setEstado] = useState<EstadoReproduccionSpotify | null>(null);
  const [guardada, setGuardada] = useState(false);
  const [vinculando, setVinculando] = useState(false);
  const usuarioRef = useRef<number | null>(null);
  const activado = useRef(false);

  const usuario = () => usuarioRef.current ?? obtenerUsuarioId() ?? 0;

  // Pide al main qué está sonando en la cuenta.
  const refrescar = useCallback(async () => {
    try {
      setEstado(await window.api.spotifyEstado(usuario()));
    } catch {
      // Silencioso: el próximo intento vuelve a probar.
    }
  }, []);

  // Se llama la primera vez que se muestra la tarjeta: averigua si hay cuenta vinculada.
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
        if (c.vinculada) void refrescar();
      })
      .catch(() => {
        activado.current = false;
        setCuenta({ configurado: false, vinculada: false });
      });
  }, [refrescar]);

  // Con la cuenta vinculada, consulta el estado cada pocos segundos.
  useEffect(() => {
    if (!cuenta?.vinculada) return;
    const id = window.setInterval(() => void refrescar(), INTERVALO_ESTADO_MS);
    return () => window.clearInterval(id);
  }, [cuenta?.vinculada, refrescar]);

  // "Guardado en Spotify" para la pista actual.
  const uriPista = estado?.pista?.uri ?? null;
  useEffect(() => {
    if (!uriPista) return setGuardada(false);
    let activo = true;
    window.api
      .spotifyEstaGuardada(usuario(), uriPista)
      .then((g) => activo && setGuardada(g))
      .catch(() => activo && setGuardada(false));
    return () => {
      activo = false;
    };
  }, [uriPista]);

  // Ejecuta una orden, muestra el error como cartel si falla y refresca enseguida.
  const ordenar = useCallback(async (accion: () => Promise<unknown>, generico: string) => {
    try {
      await accion();
      window.setTimeout(() => void refrescar(), 400);
    } catch (e) {
      avisos.error(extraerMensajeError(e, generico));
    }
  }, [avisos, refrescar]);

  const alternar = useCallback(
    () => estado?.reproduciendo
      ? ordenar(() => window.api.spotifyPausar(usuario()), 'No se pudo pausar.')
      : ordenar(() => window.api.spotifyReproducir(usuario()), 'No se pudo reproducir.'),
    [estado?.reproduciendo, ordenar]
  );

  const siguiente = useCallback(
    () => ordenar(() => window.api.spotifySiguiente(usuario()), 'No se pudo pasar de canción.'),
    [ordenar]
  );

  const anterior = useCallback(
    () => ordenar(() => window.api.spotifyAnterior(usuario()), 'No se pudo volver a la canción anterior.'),
    [ordenar]
  );

  const vincular = useCallback(async () => {
    setVinculando(true);
    try {
      await window.api.spotifyVincular(usuario());
      setCuenta({ configurado: true, vinculada: true });
      avisos.exito('Se conectó tu cuenta de Spotify.');
      void refrescar();
    } catch (e) {
      avisos.error(extraerMensajeError(e, 'No se pudo conectar Spotify.'));
    } finally {
      setVinculando(false);
    }
  }, [avisos, refrescar]);

  const desvincular = useCallback(async () => {
    try {
      await window.api.spotifyDesvincular(usuario());
      setCuenta((c) => (c ? { ...c, vinculada: false } : c));
      setEstado(null);
      avisos.exito('Se desconectó tu cuenta de Spotify.');
    } catch (e) {
      avisos.error(extraerMensajeError(e, 'No se pudo desconectar Spotify.'));
    }
  }, [avisos]);

  const valor = useMemo<SpotifyContexto>(
    () => ({ cuenta, estado, guardada, vinculando, activar, vincular, desvincular, alternar, siguiente, anterior }),
    [cuenta, estado, guardada, vinculando, activar, vincular, desvincular, alternar, siguiente, anterior]
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function usarSpotify(): SpotifyContexto {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('usarSpotify debe usarse dentro de ProveedorSpotify.');
  return contexto;
}
