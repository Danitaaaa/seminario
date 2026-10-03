import { Persistencia } from '../../persistencia/Persistencia';
import { Archivo } from './entidades';
import { materializarArchivo } from './materializador';

// Registra en la base que el contenido del archivo cambió (nuevo tamaño y fecha).
export class ActualizarContenidoArchivo {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(id: number, tamanio: number): Promise<Archivo> {
    if (!Number.isInteger(tamanio) || tamanio < 0) {
      throw new Error('El tamaño del archivo no es válido.');
    }
    const filas = await this.persistencia.ejecutar(
      `UPDATE archivos SET tamaño = $1, ultima_fecha_modificacion = NOW()
       WHERE id_archivo = $2 RETURNING *`,
      [tamanio, id]
    );
    if (filas.length === 0) throw new Error(`No existe un archivo con id ${id}.`);
    return materializarArchivo(filas[0]);
  }
}