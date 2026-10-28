// Tipos del control de Spotify (lo que devuelve el main).

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
  spotifyEstado(usuarioId: number): Promise<EstadoReproduccionSpotify | null>;
  spotifyReproducir(usuarioId: number, idDispositivo?: string): Promise<void>;
  spotifyPausar(usuarioId: number, idDispositivo?: string): Promise<void>;
  spotifySiguiente(usuarioId: number, idDispositivo?: string): Promise<void>;
  spotifyAnterior(usuarioId: number, idDispositivo?: string): Promise<void>;
  spotifyEstaGuardada(usuarioId: number, uri: string): Promise<boolean>;
}
