import { z } from 'zod';

// Tienen que coincidir con renderer/src/pages/chat/chatIAPage.tsx.
export const MAX_IMAGENES_CHAT = 4;
const MAX_IMAGEN_CHAT = 3 * 1024 * 1024; // caracteres de base64 (~2,2 MB)

// Mandar un mensaje al Chat con IA. Sin idConversacion se empieza una conversación nueva.
export const enviarMensajeChatSchema = z.object({
  // Identifica el pedido en la cola de la IA: con 'ia:cancelar' y este id se corta la respuesta.
  trabajoId: z.uuid({ error: 'Identificador de trabajo inválido.' }),
  idConversacion: z.number().int().positive().nullable().optional(),
  texto: z.string().trim().max(8000, { error: 'El mensaje no puede superar los 8000 caracteres.' }),
  // Imágenes adjuntas (JPEG en base64, sin "data:..."), ya achicadas por la app.
  imagenes: z
    .array(z.string().min(100).max(MAX_IMAGEN_CHAT).regex(/^[A-Za-z0-9+/=]+$/, { error: 'Imagen inválida.' }))
    .max(MAX_IMAGENES_CHAT, { error: `Podés adjuntar hasta ${MAX_IMAGENES_CHAT} imágenes por mensaje.` })
    .optional(),
}).refine((d) => d.texto.length > 0 || (d.imagenes?.length ?? 0) > 0, {
  error: 'Escribí un mensaje o adjuntá una imagen.',
  path: ['texto'],
});

export type EnviarMensajeChatDTO = z.infer<typeof enviarMensajeChatSchema>;

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
