import fs from 'node:fs';
import { Persistencia } from '../../persistencia/Persistencia';
import { EliminarArchivoDTO } from './dto';

// Borra el registro de la base y el archivo físico en disco.
export class EliminarArchivo {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: EliminarArchivoDTO): Promise<void> {
    const filas = await this.persistencia.ejecutar(
      `DELETE FROM archivos WHERE id_archivo = $1 RETURNING ruta_fisica`,
      [datos.id]
    );
    if (filas.length === 0) throw new Error(`No existe un archivo con id ${datos.id}.`);

    fs.unlink(filas[0].ruta_fisica, (err) => {
      if (err) console.error('[EliminarArchivo] No se pudo borrar el archivo físico:', err);
    });
  }
}