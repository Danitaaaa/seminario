import { Nodo } from './entidades';

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