import { ipcMain } from 'electron';
import { ChatIA } from '../administracionDePersistencia/chatIA';
import {
  conversacionIASchema,
  enviarMensajeChatSchema,
  renombrarConversacionIASchema,
} from '../logicaPersistente/gestionDeChatIA/dto';
import { esAbort } from '../logicaNoPersistente/ia/errores';

// Chat con IA: preguntar lo que sea usando la IA disponible (Luna → Gemini → Gemma).
// Las conversaciones quedan guardadas. Para cortar una respuesta se usa 'ia:cancelar' (una sola cola).
export function registerChatIAIpc(chatIA: ChatIA): void {
  // Cancelar no es un error: se devuelve { ok: false, cancelado: true } para que el front no muestre un cartel.
  ipcMain.handle('chatIA:enviar', async (_event, datos: unknown) => {
    const validado = enviarMensajeChatSchema.parse(datos);
    try {
      return { ok: true, ...(await chatIA.enviar(validado)) };
    } catch (error) {
      if (esAbort(error)) return { ok: false, cancelado: true };
      throw error;
    }
  });

  ipcMain.handle('chatIA:listar', async () => chatIA.listar());

  ipcMain.handle('chatIA:obtener', async (_event, datos: unknown) =>
    chatIA.obtener(conversacionIASchema.parse(datos))
  );

  ipcMain.handle('chatIA:renombrar', async (_event, datos: unknown) =>
    chatIA.renombrar(renombrarConversacionIASchema.parse(datos))
  );

  ipcMain.handle('chatIA:eliminar', async (_event, datos: unknown) => {
    await chatIA.eliminar(conversacionIASchema.parse(datos));
    return true;
  });
}
