import { Persistencia } from '../../persistencia/persistencia';
import { Archivo } from './entidades';
import { materializarArchivo } from './materializador';

// Anota en el archivo el ID de su copia en Drive (o lo borra con null).
export class GuardarDriveId {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: { id: number; driveId: string | null }): Promise<Archivo> {
    const filas = await this.persistencia.ejecutar(
      `UPDATE archivos SET drive_id = $2
       WHERE id_archivo = $1 RETURNING *`,
      [datos.id, datos.driveId]
    );
    if (filas.length === 0) throw new Error(`No existe un archivo con id ${datos.id}.`);
    return materializarArchivo(filas[0]);
  }
}