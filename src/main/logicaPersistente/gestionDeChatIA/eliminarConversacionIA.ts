import { Persistencia } from '../../persistencia/persistencia';

// Elimina una conversación del usuario con todos sus mensajes (ON DELETE CASCADE).
export class EliminarConversacionIA {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(idUsuario: number, idConversacion: number): Promise<void> {
    const filas = await this.persistencia.ejecutar(
      `DELETE FROM conversaciones_ia WHERE id_conversacion = $1 AND id_usuario = $2 RETURNING id_conversacion`,
      [idConversacion, idUsuario],
    );
    if (!filas[0]) throw new Error('No se encontró esa conversación. Puede que ya se haya eliminado.');
  }
}
