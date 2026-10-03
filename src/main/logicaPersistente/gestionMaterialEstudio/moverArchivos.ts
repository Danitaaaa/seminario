import { Persistencia } from '../../persistencia/persistencia';
import { Archivo } from './entidades';
import { materializarArchivo } from './materializador';
import { MoverArchivosDTO } from './dto';

// Reasigna la carpeta padre de uno o más archivos.
export class MoverArchivos {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: MoverArchivosDTO): Promise<Archivo[]> {
    const existentes = await this.persistencia.ejecutar(
      `SELECT id_archivo FROM archivos WHERE id_archivo = ANY($1::int[])`,
      [datos.ids]
    );
    const idsExistentes = new Set<number>(existentes.map((f: any) => f.id_archivo));
    const inexistentes = datos.ids.filter((id) => !idsExistentes.has(id));
    if (inexistentes.length > 0) {
      throw new Error(`Los siguientes ids de archivo no existen: ${inexistentes.join(', ')}`);
    }

    // El destino debe existir
    const destino = await this.persistencia.ejecutar(
      `SELECT 1 FROM nodos WHERE id_nodo = $1`,
      [datos.idPadre]
    );
    if (destino.length === 0) {
      throw new Error('La carpeta destino no existe');
    }

    const filas = await this.persistencia.ejecutar(
      `UPDATE archivos SET id_padre = $1, ultima_fecha_modificacion = NOW()
       WHERE id_archivo = ANY($2::int[]) RETURNING *`,
      [datos.idPadre, datos.ids]
    );
    return filas.map(materializarArchivo);
  }
}