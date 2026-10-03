import { Persistencia } from '../../persistencia/Persistencia';
import { Archivo } from './entidades';
import { materializarArchivo } from './materializador';
import { CrearArchivoDTO } from './dto';

// Inserta un archivo nuevo en la tabla archivos y devuelve el archivo ya creado.
export class CrearArchivo {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: CrearArchivoDTO): Promise<Archivo> {
    if (!datos.nombre.trim()) {
      throw new Error('El nombre del archivo no puede estar vacío.');
    }
    if (!datos.rutaFisica.trim()) {
      throw new Error('El archivo no tiene una ruta física.');
    }
    if (!Number.isInteger(datos.tamanio) || datos.tamanio < 0) {
      throw new Error('El tamaño del archivo no es válido.');
    }
    const filas = await this.persistencia.ejecutar(
      `INSERT INTO archivos (nombre, extension, ruta_fisica, tamaño, id_padre)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [datos.nombre, datos.extension, datos.rutaFisica, datos.tamanio, datos.idPadre]
    );
    return materializarArchivo(filas[0]);
  }
}