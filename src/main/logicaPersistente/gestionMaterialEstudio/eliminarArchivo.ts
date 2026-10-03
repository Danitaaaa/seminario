import { Persistencia } from '../../persistencia/persistencia';
import { Almacenamiento } from '../../persistencia/almacenamiento';
import { EliminarArchivoDTO } from './dto';

// Borra el registro de la base y el archivo físico en disco.
export class EliminarArchivo {
  constructor(
    private readonly persistencia: Persistencia,
    private readonly almacenamiento: Almacenamiento
  ) {}

  async ejecutar(datos: EliminarArchivoDTO): Promise<void> {
    const filas = await this.persistencia.ejecutar(
      `DELETE FROM archivos WHERE id_archivo = $1 RETURNING ruta_fisica`,
      [datos.id]
    );
    if (filas.length === 0) throw new Error(`No existe un archivo con id ${datos.id}.`);

    // Primero la fila y después el archivo: si falla el disco queda un huérfano inofensivo,
    // pero nunca un registro apuntando a un archivo inexistente.
    try {
      await this.almacenamiento.eliminar(filas[0].ruta_fisica);
    } catch (err) {
      console.error('[EliminarArchivo] No se pudo borrar el archivo físico:', err);
    }
  }
}