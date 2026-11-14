export type RolMensaje = 'usuario' | 'ia';

export interface ConversacionIA {
  idConversacion: number;
  idUsuario: number;
  titulo: string;
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

export interface MensajeIA {
  idMensaje: number;
  idConversacion: number;
  rol: RolMensaje;
  texto: string;
  // Qué IA respondió (luna, gemini o gemma); null en los mensajes del usuario.
  proveedor: string | null;
  // Imágenes que adjuntó el usuario (JPEG en base64). Vacío en las respuestas de la IA.
  imagenes: string[];
  fecha: Date;
}

// Una conversación abierta: sus datos y todos sus mensajes en orden.
export interface ConversacionConMensajes {
  conversacion: ConversacionIA;
  mensajes: MensajeIA[];
}
