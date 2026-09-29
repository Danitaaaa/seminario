import { Nodo } from './entidades';
import { Archivo } from './entidades';

// Convierte el registro de un nodo de la BD a un objeto Nodo
export function materializarNodo(fila: any): Nodo {
    return {
        id: fila.id_nodo,
        nombre: fila.nombre,
        fechaDeCarga: fila.fecha_carga,
        ultimaFechaAcceso: fila.ultima_fecha_acceso,
        ultimaFechaModificacion: fila.ultima_fecha_modificacion,
        tamaño: fila.tamaño,
        nodoPadre: fila.id_padre,
    };
}

// Convierte un objeto Nodo a un registro de un nodo de la BD
export function desmaterializarNodo(nodo: Nodo): Record<string, unknown> {
    return {
        id_nodo: nodo.id,
        nombre: nodo.nombre,
        fecha_carga: nodo.fechaDeCarga,
        ultima_fecha_acceso: nodo.ultimaFechaAcceso,
        ultima_fecha_modificacion: nodo.ultimaFechaModificacion,
        tamaño: nodo.tamaño,
        id_padre: nodo.nodoPadre,
    };
}

// Convierte un el registro de un nodo de la BD a un objeto Archivo
export function materializarArchivo(fila: any): Archivo {
  return {
    id: fila.id_archivo,
    nombre: fila.nombre,
    extension: fila.extension,
    rutaFisica: fila.ruta_fisica,
    tamanio: Number(fila.tamaño), // pg devuelve BIGINT como string
    fechaDeCarga: fila.fecha_carga,
    ultimaFechaAcceso: fila.ultima_fecha_acceso,
    ultimaFechaModificacion: fila.ultima_fecha_modificacion,
    idPadre: fila.id_padre,
  };
}

// Convierte un objeto Nodo a un registro de un nodo de la BD
export function desmaterializarArchivo(archivo: Archivo): Record<string, any> {
  return {
    id_archivo: archivo.id,
    nombre: archivo.nombre,
    extension: archivo.extension,
    ruta_fisica: archivo.rutaFisica,
    tamaño: archivo.tamanio,
    fecha_carga: archivo.fechaDeCarga,
    ultima_fecha_acceso: archivo.ultimaFechaAcceso,
    ultima_fecha_modificacion: archivo.ultimaFechaModificacion,
    id_padre: archivo.idPadre,
  };
}