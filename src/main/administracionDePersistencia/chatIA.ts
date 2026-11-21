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
import type { DocumentoChat } from '../logicaNoPersistente/ia/prompts';
import { leerArchivos, leerCarpeta, leerDocumento, type LecturaAdjuntos } from '../logicaNoPersistente/ia/lectorAdjuntos';
import { MAX_DOCUMENTOS_CHAT } from '../logicaPersistente/gestionDeChatIA/dto';
import type { Archivos } from './archivos';
import type { Almacenamiento } from '../persistencia/almacenamiento';
import type { ColaEjecucion } from '../logicaNoPersistente/ia/colaEjecucion';
import { usuarioSesionSync } from '../sesionSync';
import { AgendaParaIA } from '../logicaPersistente/gestionDeChatIA/agendaParaIA';

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

// Si el usuario manda solo adjuntos, se le pide a la IA que los explique.
function preguntaPorDefecto(imagenes: number, documentos: number): string {
  if (documentos) return documentos === 1 ? 'Explicame de qué trata este archivo.' : 'Explicame de qué tratan estos archivos.';
  return imagenes === 1 ? 'Explicame qué hay en esta imagen.' : 'Explicame qué hay en estas imágenes.';
}

export class ChatIA {
  // Archivos adjuntos de cada conversación, para que la IA los siga teniendo en las preguntas siguientes.
  // Viven mientras la app está abierta (no se guardan en la base).
  private readonly documentosPorConversacion = new Map<number, DocumentoChat[]>();

  constructor(
    private readonly asistente: AsistenteChat,
    // La misma cola de toda la IA: se cancela con 'ia:cancelar' y el trabajoId del mensaje.
    private readonly cola: ColaEjecucion,
    private readonly listarCasoUso: ListarConversacionesIA,
    private readonly obtenerCasoUso: ObtenerConversacionIA,
    private readonly guardarCasoUso: GuardarIntercambioIA,
    private readonly renombrarCasoUso: RenombrarConversacionIA,
    private readonly eliminarCasoUso: EliminarConversacionIA,
    private readonly archivos: Archivos,
    private readonly almacenamiento: Almacenamiento,
    private readonly agenda: AgendaParaIA,
  ) {}

  // Si falla armar la agenda, el chat sigue sin ella.
  private async agendaDe(idUsuario: number): Promise<string | undefined> {
    try {
      return await this.agenda.ejecutar(idUsuario);
    } catch (error) {
      console.error('[Chat IA] No se pudo armar la agenda:', error);
      return undefined;
    }
  }

  // Pregunta → respuesta de la IA disponible → se guardan las dos.
  // Si la IA falla o el usuario cancela, no se guarda nada (el texto sigue en el cuadro del front).
  async enviar(datos: EnviarMensajeChatDTO): Promise<IntercambioGuardado> {
    const idUsuario = usuarioActual();
    const idConversacion = datos.idConversacion ?? null;
    // Se lee el historial también para comprobar que la conversación es del usuario.
    const historial = idConversacion == null ? [] : (await this.obtenerCasoUso.ejecutar(idUsuario, idConversacion)).mensajes;

    const imagenes = datos.imagenes ?? [];
    const nuevos = datos.documentos ?? [];
    // Los de antes van primero; si se pasa del límite, quedan los más nuevos.
    const documentos = [...(idConversacion == null ? [] : this.documentosPorConversacion.get(idConversacion) ?? []), ...nuevos]
      .slice(-MAX_DOCUMENTOS_CHAT);
    const agenda = datos.conAgenda ? await this.agendaDe(idUsuario) : undefined;
    const respuesta = await this.cola.add(datos.trabajoId, (ctx) =>
      this.asistente.responder(
        // De los mensajes viejos solo va el texto; si tenían imágenes, se avisa para que la IA tenga contexto.
        historial.map((m) => ({
          rol: m.rol,
          texto: m.imagenes.length ? `${m.texto} [adjuntó ${m.imagenes.length === 1 ? 'una imagen' : `${m.imagenes.length} imágenes`}]`.trim() : m.texto,
        })),
        datos.texto || preguntaPorDefecto(imagenes.length, nuevos.length),
        ctx.signal,
        imagenes,
        documentos,
        agenda,
      ),
    );

    // En el mensaje guardado queda qué archivos se adjuntaron (el texto de los archivos no se guarda).
    const adjuntados = nuevos.length ? `📎 ${nuevos.map((d) => d.nombre).join(', ')}` : '';
    const guardado = await this.guardarCasoUso.ejecutar({
      idUsuario,
      idConversacion,
      tituloNueva: datos.texto
        ? tituloDesdeMensaje(datos.texto)
        : nuevos.length ? tituloDesdeMensaje(`Consulta sobre ${nuevos[0].nombre}`) : 'Consulta con imagen',
      pregunta: [datos.texto, adjuntados].filter(Boolean).join('\n'),
      imagenes,
      respuesta: respuesta.texto,
      proveedor: respuesta.proveedor,
    });
    if (documentos.length) this.documentosPorConversacion.set(guardado.conversacion.idConversacion, documentos);
    return guardado;
  }

  // Archivos o carpeta elegidos de la compu: se devuelve su texto para mandarlo con el próximo mensaje.
  async leerDeLaCompu(rutas: string[], esCarpeta: boolean): Promise<LecturaAdjuntos> {
    usuarioActual();
    return esCarpeta ? leerCarpeta(rutas[0]) : leerArchivos(rutas);
  }

  // Un archivo de Material. Pasa por Archivos para respetar los permisos de los proyectos.
  async leerDeMaterial(idArchivo: number): Promise<DocumentoChat> {
    usuarioActual();
    const archivo = await this.archivos.obtener({ id: idArchivo });
    return leerDocumento(this.almacenamiento.rutaCompleta(archivo.rutaFisica), archivo.extension, archivo.nombre);
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
    this.documentosPorConversacion.delete(datos.idConversacion);
  }
}
