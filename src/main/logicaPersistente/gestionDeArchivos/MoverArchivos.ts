import { Persistencia } from '../../persistencia/Persistencia';
import { Archivo } from './entidades';
import { materializarArchivo } from './materializador';
import { MoverArchivosDTO } from './dto';

// Reasigna el nodo padre de uno o más archivos (mover a carpeta o a la raíz).
export class MoverArchivos {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: MoverArchivosDTO): Promise<Archivo[]> {
    const filas = await this.persistencia.ejecutar(
      `UPDATE nodos SET nodo_padre_id = $1, ultima_fecha_modificacion = NOW()
       WHERE id = ANY($2) AND tipo = 'archivo' RETURNING *`,
      [datos.carpetaId, datos.ids]
    );
    return filas.map(materializarArchivo);
  }
}