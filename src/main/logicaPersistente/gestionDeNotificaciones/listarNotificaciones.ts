import { Persistencia } from '../../persistencia/persistencia';
import { Notificacion } from './entidades';
import { materializarNotificacion } from './materializador';
import { UsuarioDTO } from './dto';

const MAXIMO = 50;

// Los últimos avisos del usuario, del más nuevo al más viejo.
export class ListarNotificaciones {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: UsuarioDTO): Promise<Notificacion[]> {
    const filas = await this.persistencia.ejecutar(
      `SELECT * FROM notificaciones WHERE usuario_id = $1 ORDER BY fecha DESC, id DESC LIMIT ${MAXIMO}`,
      [datos.usuarioId]
    );
    return filas.map(materializarNotificacion);
  }
}