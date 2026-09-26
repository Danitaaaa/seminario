export interface Nodo {
    id: number;
    nombre: string;
    fechaDeCarga: Date;
    ultimaFechaAcceso: Date;
    ultimaFechaModificacion: Date;
    tamaño: BigInt;
    nodoPadre: number | null;
}


export interface ElementoContenido {
    id: number;
    nombre: string;
    tipo: 'carpeta' | 'archivo';
    fechaDeCarga: Date;
    ultimaFechaAcceso: Date;
    ultimaFechaModificacion: Date;
    tamaño: string;
}