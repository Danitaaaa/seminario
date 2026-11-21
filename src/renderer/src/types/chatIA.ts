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

// Texto de un archivo adjunto (PDF, Word o texto) que ya leyó el main.
export interface DocumentoChat {
  nombre: string;
  texto: string;
}

export interface LecturaAdjuntos {
  documentos: DocumentoChat[];
  avisos: string[];
}

export interface ChatIAApi {
  // Sin idConversacion empieza una conversación nueva. Se corta con cancelar(trabajoId).
  enviarMensajeChat(datos: {
    trabajoId: string;
    idConversacion?: number | null;
    texto: string;
    conAgenda?: boolean; // la IA ve la agenda y el material del usuario (por defecto, sí)
    imagenes?: string[];
    documentos?: DocumentoChat[];
  }): Promise<RespuestaEnviarChat>;
  // Abre el diálogo para elegir archivos (o una carpeta) de la compu. null si se cancela.
  adjuntarArchivosChat(datos: { carpeta: boolean }): Promise<LecturaAdjuntos | null>;
  // Un archivo de Material ("Buscar en Syntra").
  adjuntarMaterialChat(datos: { idArchivo: number }): Promise<DocumentoChat>;
  listarConversacionesIA(): Promise<ConversacionIA[]>;
  obtenerConversacionIA(datos: { idConversacion: number }): Promise<ConversacionConMensajes>;
  renombrarConversacionIA(datos: { idConversacion: number; titulo: string }): Promise<ConversacionIA>;
  eliminarConversacionIA(datos: { idConversacion: number }): Promise<boolean>;
}
