import { ConversacionIA, MensajeIA } from './entidades';

export function materializarConversacionIA(fila: any): ConversacionIA {
  return {
    idConversacion: fila.id_conversacion,
    idUsuario: fila.id_usuario,
    titulo: fila.titulo,
    fechaCreacion: fila.fecha_creacion,
    fechaActualizacion: fila.fecha_actualizacion,
  };
}

export function materializarMensajeIA(fila: any): MensajeIA {
  return {
    idMensaje: fila.id_mensaje,
    idConversacion: fila.id_conversacion,
    rol: fila.rol,
    texto: fila.texto,
    proveedor: fila.proveedor ?? null,
    imagenes: Array.isArray(fila.imagenes) ? fila.imagenes : [],
    fecha: fila.fecha,
  };
}
