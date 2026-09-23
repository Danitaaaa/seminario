export interface Nodo {
    id: number;
    nombre: string;
    fechaDeCarga: Date;
    ultimaFechaAcceso: Date;
    ultimaFechaModificacion: Date;
    tamaño: BigInt;
    nodoPadre: Nodo;
}