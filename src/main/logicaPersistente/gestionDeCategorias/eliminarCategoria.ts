import { Persistencia } from '../../persistencia/persistencia';
import { EliminarCategoriaDTO } from './dto';

export class EliminarCategoria {
  constructor(private readonly persistencia: Persistencia) {}

  // Al borrar una categoría, los eventos que la tenían NO se borran ni
  // quedan con una referencia rota — "categoria" en "eventos" es solo texto
  // libre, así que un evento viejo simplemente conserva el nombre como
  // quedó escrito (aunque ya no aparezca en la lista de categorías activas).
  async ejecutar(datos: EliminarCategoriaDTO): Promise<void> {
    await this.persistencia.ejecutar(`DELETE FROM categorias WHERE id = $1`, [datos.id]);
  }
}
