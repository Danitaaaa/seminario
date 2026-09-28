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