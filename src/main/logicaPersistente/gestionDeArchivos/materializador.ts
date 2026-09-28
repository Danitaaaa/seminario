import { Archivo } from './entidades';

export function materializarArchivo(fila: any): Archivo {
  return {
    id: fila.id,
    nombre: fila.nombre,
    extension: fila.extension,
    rutaFisica: fila.ruta_fisica,
    tamanio: Number(fila.tamanio), // pg devuelve BIGINT como string
    fechaDeCarga: fila.fecha_de_carga,
    ultimaFechaAcceso: fila.ultima_fecha_acceso,
    ultimaFechaModificacion: fila.ultima_fecha_modificacion,
    nodoPadreId: fila.nodo_padre_id,
    usuarioId: fila.usuario_id,
    proyectoId: fila.proyecto_id,
  };
}