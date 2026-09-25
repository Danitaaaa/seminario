import { Nodo } from './entidades';

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