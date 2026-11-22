// Representa una carpeta para la organización de material
export interface Nodo {
    id: number;
    nombre: string;
    fechaDeCarga: Date;
    ultimaFechaAcceso: Date;
    ultimaFechaModificacion: Date;
    tamaño: number;
    nodoPadre: number | null;
    idMateria: number | null; // materia asociada a la carpeta (opcional)
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
  // ID de la copia en Google Drive; null si el archivo nunca se subió.
  driveId: string | null;
  // Última sincronización con Drive: huella del archivo de Syntra y fecha de Drive en ese momento.
  driveHuella: string | null;
  driveModificado: string | null;
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
    idMateria: number | null; // solo carpetas
    materia: string | null;   // nombre de la materia, para mostrarlo en la tarjeta
}