import { Persistencia } from '../../persistencia/persistencia';
import { ConversacionIA, MensajeIA } from './entidades';
import { materializarConversacionIA, materializarMensajeIA } from './materializador';

export interface DatosIntercambioIA {
  idUsuario: number;
  // null: se crea la conversación (con `tituloNueva`).
  idConversacion: number | null;
  tituloNueva: string;
  pregunta: string;
  imagenes?: string[]; // las que adjuntó el usuario a la pregunta
  respuesta: string;
  proveedor: string;
}

export interface IntercambioGuardado {
  conversacion: ConversacionIA;
  mensajes: [MensajeIA, MensajeIA]; // [pregunta del usuario, respuesta de la IA]
}

// Guarda la pregunta y la respuesta juntas, en una transacción: o quedan las dos o ninguna.
// Se llama recién cuando la IA respondió, así una respuesta cancelada o fallida no deja nada a medias.
export class GuardarIntercambioIA {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: DatosIntercambioIA): Promise<IntercambioGuardado> {
    return this.persistencia.transaccion(async (tx) => {
      const conversacion =
        datos.idConversacion == null
          ? await tx.ejecutar(
              `INSERT INTO conversaciones_ia (id_usuario, titulo) VALUES ($1, $2) RETURNING *`,
              [datos.idUsuario, datos.tituloNueva],
            )
          : await tx.ejecutar(
              `UPDATE conversaciones_ia SET fecha_actualizacion = now()
               WHERE id_conversacion = $1 AND id_usuario = $2 RETURNING *`,
              [datos.idConversacion, datos.idUsuario],
            );
      if (!conversacion[0]) throw new Error('No se encontró esa conversación. Puede que se haya eliminado.');
      const idConversacion = conversacion[0].id_conversacion;

      const mensajes = await tx.ejecutar(
        `INSERT INTO mensajes_ia (id_conversacion, rol, texto, proveedor, imagenes)
         VALUES ($1, 'usuario', $2, NULL, $5::jsonb), ($1, 'ia', $3, $4, '[]'::jsonb)
         RETURNING *`,
        [idConversacion, datos.pregunta, datos.respuesta, datos.proveedor, JSON.stringify(datos.imagenes ?? [])],
      );
      const [pregunta, respuesta] = mensajes.map(materializarMensajeIA).sort((a, b) => a.idMensaje - b.idMensaje);
      return { conversacion: materializarConversacionIA(conversacion[0]), mensajes: [pregunta, respuesta] };
    });
  }
}
