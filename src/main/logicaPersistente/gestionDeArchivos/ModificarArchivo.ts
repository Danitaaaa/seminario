import { Persistencia } from '../../persistencia/Persistencia';
import { Archivo } from './entidades';
import { materializarArchivo } from './materializador';
import { ModificarArchivoDTO } from './dto';

// Renombra un archivo existente y devuelve el archivo actualizado.
export class ModificarArchivo {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: ModificarArchivoDTO): Promise<Archivo> {
    const filas = await this.persistencia.ejecutar(
      `UPDATE nodos SET nombre = $1, ultima_fecha_modificacion = NOW()
       WHERE id = $2 AND tipo = 'archivo' RETURNING *`,
      [datos.nombre, datos.id]
    );
    if (filas.length === 0) throw new Error('Archivo no encontrado');
    return materializarArchivo(filas[0]);
  }
}