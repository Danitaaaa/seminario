import { Persistencia } from '../../persistencia/Persistencia';
import { Archivo } from './entidades';
import { materializarArchivo } from './materializador';
import { CrearArchivoDTO } from './dto';

// Inserta un archivo nuevo en la tabla nodos y devuelve el archivo ya creado.
export class CrearArchivo {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: CrearArchivoDTO): Promise<Archivo> {
    const filas = await this.persistencia.ejecutar(
      `INSERT INTO nodos (tipo, nombre, extension, ruta_fisica, tamanio, nodo_padre_id, usuario_id, proyecto_id)
       VALUES ('archivo', $1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [datos.nombre, datos.extension, datos.rutaFisica, datos.tamanio, datos.nodoPadreId, datos.usuarioId, datos.proyectoId]
    );
    return materializarArchivo(filas[0]);
  }
}