import { Persistencia } from '../../persistencia/Persistencia';
import { Archivo } from './entidades';
import { materializarArchivo } from './materializador';
import { ObtenerArchivoDTO } from './dto';

// Devuelve un archivo por id y registra el acceso.
export class ObtenerArchivo {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: ObtenerArchivoDTO): Promise<Archivo> {
    const filas = await this.persistencia.ejecutar(
      `UPDATE archivos SET ultima_fecha_acceso = NOW()
       WHERE id_archivo = $1 RETURNING *`,
      [datos.id]
    );
    if (filas.length === 0) throw new Error(`No existe un archivo con id ${datos.id}.`);
    return materializarArchivo(filas[0]);
  }
}