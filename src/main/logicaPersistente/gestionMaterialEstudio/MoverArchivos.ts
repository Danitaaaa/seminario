import { Persistencia } from '../../persistencia/Persistencia';
import { Archivo } from './entidades';
import { materializarArchivo } from './materializador';
import { MoverArchivosDTO } from './dto';

// Reasigna la carpeta padre de uno o más archivos.
export class MoverArchivos {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: MoverArchivosDTO): Promise<Archivo[]> {
    const filas = await this.persistencia.ejecutar(
      `UPDATE archivos SET id_padre = $1, ultima_fecha_modificacion = NOW()
       WHERE id_archivo = ANY($2::int[]) RETURNING *`,
      [datos.idPadre, datos.ids]
    );
    return filas.map(materializarArchivo);
  }
}