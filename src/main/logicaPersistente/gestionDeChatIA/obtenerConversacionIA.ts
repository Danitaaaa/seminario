import { Persistencia } from '../../persistencia/persistencia';
import { ConversacionConMensajes } from './entidades';
import { materializarConversacionIA, materializarMensajeIA } from './materializador';

// Una conversación del usuario con sus mensajes. Si no existe o es de otro usuario, da error.
export class ObtenerConversacionIA {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(idUsuario: number, idConversacion: number): Promise<ConversacionConMensajes> {
    const filas = await this.persistencia.ejecutar(
      `SELECT * FROM conversaciones_ia WHERE id_conversacion = $1 AND id_usuario = $2`,
      [idConversacion, idUsuario],
    );
    if (!filas[0]) throw new Error('No se encontró esa conversación. Puede que se haya eliminado.');

    const mensajes = await this.persistencia.ejecutar(
      `SELECT * FROM mensajes_ia WHERE id_conversacion = $1 ORDER BY id_mensaje`,
      [idConversacion],
    );
    return { conversacion: materializarConversacionIA(filas[0]), mensajes: mensajes.map(materializarMensajeIA) };
  }
}
