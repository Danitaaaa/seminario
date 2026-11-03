import { Persistencia } from '../../persistencia/persistencia';
import { Archivo } from './entidades';
import { materializarArchivo } from './materializador';
import { ModificarArchivoDTO } from './dto';
import { registrarCambioContenido } from '../gestionDeProyectos/alcanceContenido';
import { exigirPermisoArchivo } from './alcanceContenido';

// Renombra un archivo existente y devuelve el archivo actualizado
export class ModificarArchivo {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: ModificarArchivoDTO): Promise<Archivo> {
    if (!datos.nombre.trim()) {
      throw new Error('El nombre del archivo no puede estar vacío.');
    }

    await exigirPermisoArchivo(this.persistencia, datos.id, 'archivo.renombrar');

    const filas = await this.persistencia.ejecutar(
      `UPDATE archivos SET nombre = $1, ultima_fecha_modificacion = NOW()
       WHERE id_archivo = $2 RETURNING *`,
      [datos.nombre, datos.id]
    );
    if (filas.length === 0) throw new Error('Archivo no encontrado');
    const f = filas[0];
    await registrarCambioContenido(this.persistencia, 'archivo', f.id_archivo, 'modificar',
      f.id_global, f.id_padre, { nombre: f.nombre, extension: f.extension });
    return materializarArchivo(f);
  }
}