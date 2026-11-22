export interface Archivo {
  id: number;
  nombre: string;
  extension: string;
  rutaFisica: string;
  tamanio: number;
  fechaDeCarga: string;
  ultimaFechaAcceso: string | null;
  ultimaFechaModificacion: string | null;
  nodoPadreId: number | null;
  usuarioId: number | null;
  proyectoId: number | null;
}

export interface AplicacionExterna {
  id: string;
  nombre: string;
}
// Versión que se conserva cuando un documento cambió en Syntra y en Google Docs.
export type LadoDrive = 'syntra' | 'google';
