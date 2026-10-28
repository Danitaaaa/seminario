import { Persistencia } from '../../persistencia/persistencia';
import { UsuarioDTO } from './dto';

// Saca de la campanita los avisos ya leídos del usuario.
// Se marcan como borrados en vez de eliminarlos: si la fila desaparece, la clave queda libre
// y el vigía volvería a crear el mismo aviso (por ejemplo, el recordatorio de un evento).
export class BorrarLeidas {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: UsuarioDTO): Promise<void> {
    await this.persistencia.ejecutar(
      `UPDATE notificaciones SET borrada = TRUE WHERE usuario_id = $1 AND leida = TRUE AND borrada = FALSE`,
      [datos.usuarioId]
    );
  }
}