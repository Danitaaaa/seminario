/*export interface Nodo {
    id: number;
    nombre: string;
    fechaDeCarga: Date;
    ultimaFechaAcceso: Date;
    ultimaFechaModificacion: Date;
    tamaño: BigInt;
    nodoPadre: number | null;
}*/

export interface Nodo {
    id: number;
    nombre: string;
    fechaDeCarga: string;
    ultimaFechaAcceso: string;
    ultimaFechaModificacion: string;
    tamaño: BigInt;
    nodoPadre: number | null;
}