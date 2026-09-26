interface NodoBase {
    id: number;
    nombre: string;
    fechaDeCarga: string;
    ultimaFechaAcceso: string;
    ultimaFechaModificacion: string;
    tamaño: string;
}

export interface Carpeta extends NodoBase {
    tipo: 'carpeta';
}

export interface Archivo extends NodoBase {
    tipo: 'archivo';
    extension: string | null;
}

export type Nodo = Carpeta | Archivo;