export interface Archivo {
  id: number;
  nombre: string;
  extension: string;
  rutaFisica: string;
  tamanio: number;
  fechaDeCarga: Date;
  ultimaFechaAcceso: Date | null;
  ultimaFechaModificacion: Date | null;
  nodoPadreId: number | null;
  usuarioId: number | null;
  proyectoId: number | null;
}