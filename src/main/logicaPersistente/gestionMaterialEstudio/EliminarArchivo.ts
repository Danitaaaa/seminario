import fs from 'node:fs';
import { Persistencia } from '../../persistencia/Persistencia';
import { EliminarArchivoDTO } from './dto';

// Borra el registro de la base y el archivo físico en disco.
export class EliminarArchivo {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: EliminarArchivoDTO): Promise<void> {
    const filas = await this.persistencia.ejecutar(
      `SELECT ruta_fisica FROM archivos WHERE id_archivo = $1`,
      [datos.id]
    );
    if (filas.length === 0) throw new Error(`No existe un archivo con id ${datos.id}.`);

    try {
      await fs.promises.unlink(filas[0].ruta_fisica);
    } catch (err: any) {
      // Si el archivo ya no existe en disco, se sigue y se borra el registro igual.
      if (err.code !== 'ENOENT') {
        throw new Error(`No se pudo borrar el archivo físico: ${err.message}`);
      }
    }

    await this.persistencia.ejecutar(
      `DELETE FROM archivos WHERE id_archivo = $1`,
      [datos.id]
    );
  }
}