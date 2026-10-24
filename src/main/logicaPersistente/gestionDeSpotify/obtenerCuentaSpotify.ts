import { Persistencia } from '../../persistencia/persistencia';
import { CuentaSpotify } from './entidades';

// Devuelve la cuenta de Spotify vinculada al usuario, o null si no vinculó ninguna.
export class ObtenerCuentaSpotify {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(idUsuario: number): Promise<CuentaSpotify | null> {
    const filas = await this.persistencia.ejecutar(
      `SELECT id_usuario, refresh_token, cifrado, alcances, fecha_vinculacion
         FROM spotify_cuenta
        WHERE id_usuario = $1`,
      [idUsuario]
    );
    if (filas.length === 0) return null;
    const fila: any = filas[0];
    return {
      idUsuario: fila.id_usuario,
      refreshToken: fila.refresh_token,
      cifrado: fila.cifrado,
      alcances: fila.alcances,
      fechaVinculacion: fila.fecha_vinculacion,
    };
  }
}
