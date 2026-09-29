export interface Nodo {
    id: number;
    nombre: string;
    fechaDeCarga: Date;
    ultimaFechaAcceso: Date;
    ultimaFechaModificacion: Date;
    tamaño: BigInt;
    nodoPadre: number | null;
}


export interface Archivo {
  id: number;
  nombre: string;
  extension: string;
  rutaFisica: string;
  tamanio: number;
  fechaDeCarga: Date;
  ultimaFechaAcceso: Date;
  ultimaFechaModificacion: Date;
  idPadre: number;
}


export interface ElementoContenido {
    id: number;
    nombre: string;
    tipo: 'archivo' | 'carpeta';
    fechaDeCarga: Date;
    ultimaFechaAcceso: Date;
    ultimaFechaModificacion: Date;
    tamaño: string;
    extension: string;
}