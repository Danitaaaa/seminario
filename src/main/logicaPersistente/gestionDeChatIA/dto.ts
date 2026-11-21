import { z } from 'zod';

// Tienen que coincidir con renderer/src/pages/chat/chatIAPage.tsx.
export const MAX_IMAGENES_CHAT = 4;
const MAX_IMAGEN_CHAT = 3 * 1024 * 1024; // caracteres de base64 (~2,2 MB)
// Tienen que coincidir con logicaNoPersistente/ia/lectorAdjuntos.ts.
export const MAX_DOCUMENTOS_CHAT = 10;
const MAX_TEXTO_DOCUMENTO = 30_000;

// Mandar un mensaje al Chat con IA. Sin idConversacion se empieza una conversación nueva.
export const enviarMensajeChatSchema = z.object({
  // Identifica el pedido en la cola de la IA: con 'ia:cancelar' y este id se corta la respuesta.
  trabajoId: z.uuid({ error: 'Identificador de trabajo inválido.' }),
  idConversacion: z.number().int().positive().nullable().optional(),
  // Si la IA puede ver la agenda y el material del usuario (se apaga desde el chat).
  conAgenda: z.boolean().default(true),
  texto: z.string().trim().max(8000, { error: 'El mensaje no puede superar los 8000 caracteres.' }),
  // Imágenes adjuntas (JPEG en base64, sin "data:..."), ya achicadas por la app.
  imagenes: z
    .array(z.string().min(100).max(MAX_IMAGEN_CHAT).regex(/^[A-Za-z0-9+/=]+$/, { error: 'Imagen inválida.' }))
    .max(MAX_IMAGENES_CHAT, { error: `Podés adjuntar hasta ${MAX_IMAGENES_CHAT} imágenes por mensaje.` })
    .optional(),
  // Texto de los archivos adjuntos (lo leyó el main con 'chatIA:adjuntarArchivos' o 'chatIA:adjuntarMaterial').
  documentos: z
    .array(z.object({ nombre: z.string().trim().min(1).max(255), texto: z.string().min(1).max(MAX_TEXTO_DOCUMENTO) }))
    .max(MAX_DOCUMENTOS_CHAT, { error: `Podés adjuntar hasta ${MAX_DOCUMENTOS_CHAT} archivos.` })
    .optional(),
}).refine((d) => d.texto.length > 0 || (d.imagenes?.length ?? 0) > 0 || (d.documentos?.length ?? 0) > 0, {
  error: 'Escribí un mensaje o adjuntá una imagen o un archivo.',
  path: ['texto'],
});

export type EnviarMensajeChatDTO = z.infer<typeof enviarMensajeChatSchema>;

// Elegir archivos (o una carpeta) de la compu para el chat.
export const adjuntarArchivosChatSchema = z.object({ carpeta: z.boolean().default(false) });

// Adjuntar un archivo de Material ("Buscar en Syntra").
export const adjuntarMaterialChatSchema = z.object({ idArchivo: z.number().int().positive() });

// Abrir o eliminar una conversación.
export const conversacionIASchema = z.object({
  idConversacion: z.number().int().positive(),
});

export type ConversacionIADTO = z.infer<typeof conversacionIASchema>;

export const renombrarConversacionIASchema = z.object({
  idConversacion: z.number().int().positive(),
  titulo: z
    .string()
    .trim()
    .min(1, { error: 'El título no puede estar vacío.' })
    .max(120, { error: 'El título no puede superar los 120 caracteres.' }),
});

export type RenombrarConversacionIADTO = z.infer<typeof renombrarConversacionIASchema>;
