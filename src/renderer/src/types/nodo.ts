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
    idMateria?: number | null; // materia asociada (solo en Material personal)
    materia?: string | null;   // su nombre, para mostrarlo
}

export interface Archivo extends NodoBase {
    tipo: 'archivo';
    extension: string | null;
}

export type Nodo = Carpeta | Archivo;

export const claveNodo = (n: Nodo) => `${n.tipo}-${n.id}`;

// Lo que se subió al importar una carpeta o lo arrastrado desde el explorador.
export interface ResultadoImportacion {
  carpetas: number;
  archivos: number;
  salteados: number;
}
