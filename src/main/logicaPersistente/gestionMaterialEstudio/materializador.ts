import { Nodo, Archivo } from './entidades';

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
    driveId: fila.drive_id ?? null,
  };
}