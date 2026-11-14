import { Persistencia } from '../../persistencia/persistencia';
import { ConversacionIA } from './entidades';
import { materializarConversacionIA } from './materializador';

// Cambia el título de una conversación del usuario.
export class RenombrarConversacionIA {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(idUsuario: number, idConversacion: number, titulo: string): Promise<ConversacionIA> {
    const filas = await this.persistencia.ejecutar(
      `UPDATE conversaciones_ia SET titulo = $3
       WHERE id_conversacion = $1 AND id_usuario = $2 RETURNING *`,
      [idConversacion, idUsuario, titulo],
    );
    if (!filas[0]) throw new Error('No se encontró esa conversación. Puede que se haya eliminado.');
    return materializarConversacionIA(filas[0]);
  }
}
