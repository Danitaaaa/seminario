import { Persistencia } from '../../persistencia/persistencia';
import { Almacenamiento } from '../../persistencia/almacenamiento';
import { Archivo } from './entidades';
import { materializarArchivo } from './materializador';
import { registrarCambioContenido } from '../gestionDeProyectos/alcanceContenido';

// Reemplaza el contenido físico del archivo y registra el nuevo tamaño y fecha
export class ActualizarContenidoArchivo {
  constructor(
    private readonly persistencia: Persistencia,
    private readonly almacenamiento: Almacenamiento
  ) {}

  async ejecutar(id: number, rutaOrigen: string): Promise<Archivo> {
    const existente = await this.persistencia.ejecutar(
      `SELECT ruta_fisica FROM archivos WHERE id_archivo = $1`,
      [id]
    );
    if (existente.length === 0) throw new Error(`No existe un archivo con id ${id}.`);

    const tamanio = await this.almacenamiento.reemplazar(existente[0].ruta_fisica, rutaOrigen);

    const filas = await this.persistencia.ejecutar(
      `UPDATE archivos SET tamaño = $1, ultima_fecha_modificacion = NOW()
       WHERE id_archivo = $2 RETURNING *`,
      [tamanio, id]
    );
    const f = filas[0];
    // El contenido sube por el camino de versiones (leer + bloqueo); esto solo lo marca como pendiente.
    await registrarCambioContenido(this.persistencia, 'archivo', f.id_archivo, 'modificar',
      f.id_global, f.id_padre, { nombre: f.nombre, extension: f.extension });
    return materializarArchivo(f);
  }
}
