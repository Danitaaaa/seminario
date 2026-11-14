import { Persistencia } from '../../persistencia/persistencia';
import { ConversacionIA } from './entidades';
import { materializarConversacionIA } from './materializador';

// Las conversaciones del usuario, la última usada primero.
export class ListarConversacionesIA {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(idUsuario: number): Promise<ConversacionIA[]> {
    const filas = await this.persistencia.ejecutar(
      `SELECT * FROM conversaciones_ia
       WHERE id_usuario = $1
       ORDER BY fecha_actualizacion DESC, id_conversacion DESC`,
      [idUsuario],
    );
    return filas.map(materializarConversacionIA);
  }
}
