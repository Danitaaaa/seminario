import { ListarConversacionesIA } from '../logicaPersistente/gestionDeChatIA/listarConversacionesIA';
import { ObtenerConversacionIA } from '../logicaPersistente/gestionDeChatIA/obtenerConversacionIA';
import { GuardarIntercambioIA, type IntercambioGuardado } from '../logicaPersistente/gestionDeChatIA/guardarIntercambioIA';
import { RenombrarConversacionIA } from '../logicaPersistente/gestionDeChatIA/renombrarConversacionIA';
import { EliminarConversacionIA } from '../logicaPersistente/gestionDeChatIA/eliminarConversacionIA';
import type { ConversacionConMensajes, ConversacionIA } from '../logicaPersistente/gestionDeChatIA/entidades';
import type {
  ConversacionIADTO,
  EnviarMensajeChatDTO,
  RenombrarConversacionIADTO,
} from '../logicaPersistente/gestionDeChatIA/dto';
import type { AsistenteChat } from '../logicaNoPersistente/ia/asistenteChat';
import type { ColaEjecucion } from '../logicaNoPersistente/ia/colaEjecucion';
import { usuarioSesionSync } from '../sesionSync';

function usuarioActual(): number {
  const id = usuarioSesionSync();
  if (id == null) throw new Error('No hay una sesión iniciada.');
  return id;
}

// El título de una conversación nueva sale de la primera pregunta (el usuario lo puede cambiar).
export function tituloDesdeMensaje(texto: string, maximo = 60): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  if (limpio.length <= maximo) return limpio || 'Conversación nueva';
  const corte = limpio.slice(0, maximo);
  const ultimoEspacio = corte.lastIndexOf(' ');
  return `${(ultimoEspacio > maximo / 2 ? corte.slice(0, ultimoEspacio) : corte).trimEnd()}…`;
}

export class ChatIA {
  constructor(
    private readonly asistente: AsistenteChat,
    // La misma cola de toda la IA: se cancela con 'ia:cancelar' y el trabajoId del mensaje.
    private readonly cola: ColaEjecucion,
    private readonly listarCasoUso: ListarConversacionesIA,
    private readonly obtenerCasoUso: ObtenerConversacionIA,
    private readonly guardarCasoUso: GuardarIntercambioIA,
    private readonly renombrarCasoUso: RenombrarConversacionIA,
    private readonly eliminarCasoUso: EliminarConversacionIA,
  ) {}

  // Pregunta → respuesta de la IA disponible → se guardan las dos.
  // Si la IA falla o el usuario cancela, no se guarda nada (el texto sigue en el cuadro del front).
  async enviar(datos: EnviarMensajeChatDTO): Promise<IntercambioGuardado> {
    const idUsuario = usuarioActual();
    const idConversacion = datos.idConversacion ?? null;
    // Se lee el historial también para comprobar que la conversación es del usuario.
    const historial = idConversacion == null ? [] : (await this.obtenerCasoUso.ejecutar(idUsuario, idConversacion)).mensajes;

    const imagenes = datos.imagenes ?? [];
    const respuesta = await this.cola.add(datos.trabajoId, (ctx) =>
      this.asistente.responder(
        // De los mensajes viejos solo va el texto; si tenían imágenes, se avisa para que la IA tenga contexto.
        historial.map((m) => ({
          rol: m.rol,
          texto: m.imagenes.length ? `${m.texto} [adjuntó ${m.imagenes.length === 1 ? 'una imagen' : `${m.imagenes.length} imágenes`}]`.trim() : m.texto,
        })),
        datos.texto || (imagenes.length === 1 ? 'Explicame qué hay en esta imagen.' : 'Explicame qué hay en estas imágenes.'),
        ctx.signal,
        imagenes,
      ),
    );

    return this.guardarCasoUso.ejecutar({
      idUsuario,
      idConversacion,
      tituloNueva: datos.texto ? tituloDesdeMensaje(datos.texto) : 'Consulta con imagen',
      pregunta: datos.texto,
      imagenes,
      respuesta: respuesta.texto,
      proveedor: respuesta.proveedor,
    });
  }

  async listar(): Promise<ConversacionIA[]> {
    return this.listarCasoUso.ejecutar(usuarioActual());
  }

  async obtener(datos: ConversacionIADTO): Promise<ConversacionConMensajes> {
    return this.obtenerCasoUso.ejecutar(usuarioActual(), datos.idConversacion);
  }

  async renombrar(datos: RenombrarConversacionIADTO): Promise<ConversacionIA> {
    return this.renombrarCasoUso.ejecutar(usuarioActual(), datos.idConversacion, datos.titulo);
  }

  async eliminar(datos: ConversacionIADTO): Promise<void> {
    await this.eliminarCasoUso.ejecutar(usuarioActual(), datos.idConversacion);
  }
}
