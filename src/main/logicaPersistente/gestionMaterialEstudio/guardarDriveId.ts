import { Persistencia } from '../../persistencia/persistencia';
import { Archivo } from './entidades';
import { materializarArchivo } from './materializador';

// Estado del archivo al sincronizarse con Drive (ver 048_drive_sincronizacion.sql).
export interface SincronizacionDrive {
  huella: string;
  modificado: string;
}

// Anota en el archivo el ID de su copia en Drive (o lo borra con null) y cómo quedó la última sincronización.
export class GuardarDriveId {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: { id: number; driveId: string | null; sincronizacion?: SincronizacionDrive | null }): Promise<Archivo> {
    const filas = await this.persistencia.ejecutar(
      `UPDATE archivos SET drive_id = $2, drive_huella = $3, drive_modificado = $4
       WHERE id_archivo = $1 RETURNING *`,
      [datos.id, datos.driveId, datos.sincronizacion?.huella ?? null, datos.sincronizacion?.modificado ?? null]
    );
    if (filas.length === 0) throw new Error(`No existe un archivo con id ${datos.id}.`);
    return materializarArchivo(filas[0]);
  }
}
