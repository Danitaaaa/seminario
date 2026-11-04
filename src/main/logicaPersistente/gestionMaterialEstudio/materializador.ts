import { Nodo, Archivo } from './entidades';

// pg devuelve BIGINT como string: lo pasa a number y rechaza valores que no son un tamaño
function aTamanio(valor: unknown): number {
    const tamanio = Number(valor ?? 0);
    if (!Number.isFinite(tamanio) || tamanio < 0) throw new Error('El tamaño no es válido.');
    return tamanio;
}

// Convierte el registro de un nodo de la BD a un objeto Nodo
export function materializarNodo(fila: any): Nodo {
    if (!fila) throw new Error('La carpeta no existe.');
    return {
        id: fila.id_nodo,
        nombre: fila.nombre,
        fechaDeCarga: fila.fecha_carga,
        ultimaFechaAcceso: fila.ultima_fecha_acceso,
        ultimaFechaModificacion: fila.ultima_fecha_modificacion,
        tamaño: aTamanio(fila.tamaño),
        nodoPadre: fila.id_padre,
        idMateria: fila.id_materia ?? null,
    };
}

// Convierte un el registro de un nodo de la BD a un objeto Archivo
export function materializarArchivo(fila: any): Archivo {
  if (!fila) throw new Error('El archivo no existe.');
  return {
    id: fila.id_archivo,
    nombre: fila.nombre,
    extension: fila.extension,
    rutaFisica: fila.ruta_fisica,
    tamanio: aTamanio(fila.tamaño),
    fechaDeCarga: fila.fecha_carga,
    ultimaFechaAcceso: fila.ultima_fecha_acceso,
    ultimaFechaModificacion: fila.ultima_fecha_modificacion,
    idPadre: fila.id_padre,
    driveId: fila.drive_id ?? null,
  };
}
