import { Persistencia } from '../../persistencia/persistencia';
import { EliminarCategoriaDTO } from './dto';

// Eliminar la categoría con el ID indicado
export class EliminarCategoria {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: EliminarCategoriaDTO): Promise<void> {
    await this.persistencia.ejecutar(`DELETE FROM categorias WHERE id = $1`, [datos.id]);
  }
}
