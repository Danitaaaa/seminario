// Chat con IA: tipos que comparten la pantalla y window.api (ver src/preload/apis/ia.ts).

export type RolMensajeIA = 'usuario' | 'ia';

export interface ConversacionIA {
  idConversacion: number;
  idUsuario: number;
  titulo: string;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface MensajeIA {
  idMensaje: number;
  idConversacion: number;
  rol: RolMensajeIA;
  texto: string;
  proveedor: string | null; // gptMini | gemma (o los de antes); null en los del usuario
  imagenes: string[]; // las que adjuntó el usuario (JPEG en base64)
  fecha: string;
}

export interface ConversacionConMensajes {
  conversacion: ConversacionIA;
  mensajes: MensajeIA[];
}

export type RespuestaEnviarChat =
  | { ok: true; conversacion: ConversacionIA; mensajes: [MensajeIA, MensajeIA] }
  | { ok: false; cancelado: true };

export interface ChatIAApi {
  // Sin idConversacion empieza una conversación nueva. Se corta con cancelar(trabajoId).
  enviarMensajeChat(datos: { trabajoId: string; idConversacion?: number | null; texto: string; imagenes?: string[] }): Promise<RespuestaEnviarChat>;
  listarConversacionesIA(): Promise<ConversacionIA[]>;
  obtenerConversacionIA(datos: { idConversacion: number }): Promise<ConversacionConMensajes>;
  renombrarConversacionIA(datos: { idConversacion: number; titulo: string }): Promise<ConversacionIA>;
  eliminarConversacionIA(datos: { idConversacion: number }): Promise<boolean>;
}
