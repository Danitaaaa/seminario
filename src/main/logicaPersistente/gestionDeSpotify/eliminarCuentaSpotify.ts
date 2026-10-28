import { Persistencia } from '../../persistencia/persistencia';

// Desvincula la cuenta de Spotify del usuario.
export class EliminarCuentaSpotify {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(idUsuario: number): Promise<void> {
    await this.persistencia.ejecutar(`DELETE FROM spotify_cuenta WHERE id_usuario = $1`, [idUsuario]);
  }
}
