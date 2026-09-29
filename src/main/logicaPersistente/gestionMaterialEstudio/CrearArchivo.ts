import { Persistencia } from '../../persistencia/Persistencia';
import { Archivo } from './entidades';
import { materializarArchivo } from './materializador';
import { CrearArchivoDTO } from './dto';

// Inserta un archivo nuevo en la tabla archivos y devuelve el archivo ya creado.
export class CrearArchivo {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: CrearArchivoDTO): Promise<Archivo> {
    const filas = await this.persistencia.ejecutar(
      `INSERT INTO archivos (nombre, extension, ruta_fisica, tamaño, id_padre)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [datos.nombre, datos.extension, datos.rutaFisica, datos.tamanio, datos.idPadre]
    );
    return materializarArchivo(filas[0]);
  }
}