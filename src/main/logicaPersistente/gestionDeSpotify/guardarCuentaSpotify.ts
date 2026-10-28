import { Persistencia } from '../../persistencia/persistencia';
import { GuardarCuentaSpotifyDTO } from './dto';

// Guarda la cuenta vinculada; si el usuario ya tenía una, la reemplaza (re-vinculación o token rotado).
export class GuardarCuentaSpotify {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: GuardarCuentaSpotifyDTO): Promise<void> {
    await this.persistencia.ejecutar(
      `INSERT INTO spotify_cuenta (id_usuario, refresh_token, cifrado, alcances)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id_usuario) DO UPDATE
         SET refresh_token = EXCLUDED.refresh_token,
             cifrado = EXCLUDED.cifrado,
             alcances = EXCLUDED.alcances`,
      [datos.idUsuario, datos.refreshToken, datos.cifrado, datos.alcances]
    );
  }
}
