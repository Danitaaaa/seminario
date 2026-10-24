// Tipos del reproductor de Spotify (lo que devuelve el main y lo que usa el Web Playback SDK).

export interface EstadoCuentaSpotify {
  configurado: boolean;
  vinculada: boolean;
}

export interface PistaSpotify {
  uri: string;
  nombre: string;
  artistas: string;
  album: string;
  imagen: string | null;
  duracionMs: number;
  numero: number;
}

export interface EstadoReproduccionSpotify {
  reproduciendo: boolean;
  progresoMs: number;
  dispositivo: { id: string | null; nombre: string } | null;
  pista: PistaSpotify | null;
  contexto: { uri: string; nombre: string; subtitulo: string } | null;
}

export interface SpotifyApi {
  spotifyEstadoCuenta(usuarioId: number): Promise<EstadoCuentaSpotify>;
  spotifyVincular(usuarioId: number): Promise<void>;
  spotifyDesvincular(usuarioId: number): Promise<void>;
  spotifyToken(usuarioId: number): Promise<string>;
  spotifyEstado(usuarioId: number): Promise<EstadoReproduccionSpotify | null>;
  spotifyReproducir(usuarioId: number, idDispositivo?: string): Promise<void>;
  spotifyPausar(usuarioId: number, idDispositivo?: string): Promise<void>;
  spotifySiguiente(usuarioId: number, idDispositivo?: string): Promise<void>;
  spotifyAnterior(usuarioId: number, idDispositivo?: string): Promise<void>;
  spotifyTransferir(usuarioId: number, idDispositivo: string, reproducir: boolean): Promise<void>;
  spotifyEstaGuardada(usuarioId: number, uri: string): Promise<boolean>;
}

// ---- Web Playback SDK (https://sdk.scdn.co/spotify-player.js), solo lo que usa la app ----

export interface SdkEstadoReproductor {
  paused: boolean;
  position: number;
  duration: number;
  context: { uri: string | null; metadata: { name?: string } | null };
  track_window: {
    current_track: {
      uri: string;
      name: string;
      track_number?: number;
      duration_ms: number;
      artists: { name: string }[];
      album: { name: string; images: { url: string }[] };
    } | null;
  };
}

export interface SdkReproductor {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(evento: 'ready' | 'not_ready', cb: (d: { device_id: string }) => void): void;
  addListener(evento: 'player_state_changed', cb: (estado: SdkEstadoReproductor | null) => void): void;
  addListener(
    evento: 'initialization_error' | 'authentication_error' | 'account_error' | 'playback_error' | 'autoplay_failed',
    cb: (e: { message: string }) => void
  ): void;
  togglePlay(): Promise<void>;
  nextTrack(): Promise<void>;
  previousTrack(): Promise<void>;
  activateElement(): Promise<void>;
}

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify?: {
      Player: new (opciones: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SdkReproductor;
    };
  }
}
