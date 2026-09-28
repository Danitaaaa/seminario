import { Persistencia } from '../../persistencia/Persistencia';
import { Archivo } from './entidades';
import { materializarArchivo } from './materializador';

// Devuelve todos los archivos (tipo = 'archivo'), los más nuevos primero.
export class ListarArchivos {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(): Promise<Archivo[]> {
    const filas = await this.persistencia.ejecutar(
      `SELECT * FROM nodos WHERE tipo = 'archivo' ORDER BY fecha_de_carga DESC`
    );
    return filas.map(materializarArchivo);
  }
}

//no lleva dto porque no recibe datos de entrada, solo devuelve un listado de archivos.