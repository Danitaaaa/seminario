import { Persistencia } from '../../persistencia/persistencia';
import { Almacenamiento } from '../../persistencia/almacenamiento';
import { Archivo } from './entidades';
import { materializarArchivo } from './materializador';
import { CrearArchivoDTO } from './dto';

const MAX_INTENTOS = 100;
const UNIQUE_VIOLATION = '23505';

// Copia el archivo al almacenamiento e inserta su registro en la base.
export class CrearArchivo {
  constructor(
    private readonly persistencia: Persistencia,
    private readonly almacenamiento: Almacenamiento
  ) {}

  async ejecutar(datos: CrearArchivoDTO): Promise<Archivo> {
    if (!datos.nombre.trim()) {
      throw new Error('El nombre del archivo no puede estar vacío.');
    }
    if (!datos.rutaFisica.trim()) {
      throw new Error('No se indicó el archivo a subir.');
    }

    const { rutaFisica, tamanio } = await this.almacenamiento.guardar(datos.rutaFisica, datos.extension);

    try {
      // Si el nombre está ocupado en la carpeta, se agrega un número: "nombre (1)"
      for (let intento = 0; intento < MAX_INTENTOS; intento++) {
        const nombre = intento === 0 ? datos.nombre : `${datos.nombre} (${intento})`;
        try {
          const filas = await this.persistencia.ejecutar(
            `INSERT INTO archivos (nombre, extension, ruta_fisica, tamaño, id_padre)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [nombre, datos.extension, rutaFisica, tamanio, datos.idPadre]
          );
          return materializarArchivo(filas[0]);
        } catch (error: any) {
          if (error.code !== UNIQUE_VIOLATION) throw error;
        }
      }
      throw new Error('No se pudo generar un nombre único para el archivo');
    } catch (error) {
      // No dejar el archivo físico huérfano si no se pudo registrar
      await this.almacenamiento.eliminar(rutaFisica);
      throw error;
    }
  }
}