import { IntentoCuestionario, MaterialIA } from './entidades';

export function materializarMaterialIA(fila: any): MaterialIA {
  return {
    idMaterialIA: fila.id_material_ia,
    idUsuario: fila.id_usuario,
    idArchivo: fila.id_archivo ?? null,
    nombreArchivo: fila.nombre_archivo ?? null,
    tipo: fila.tipo,
    titulo: fila.titulo,
    contenido: fila.contenido,
    proveedores: fila.proveedores ?? [],
    fechaCreacion: fila.fecha_creacion,
  };
}

export function materializarIntentoCuestionario(fila: any): IntentoCuestionario {
  return {
    idIntento: fila.id_intento,
    idMaterialIA: fila.id_material_ia,
    respuestas: fila.respuestas ?? [],
    correctas: fila.correctas,
    total: fila.total,
    temasAReforzar: fila.temas_a_reforzar ?? [],
    fecha: fila.fecha,
  };
}
