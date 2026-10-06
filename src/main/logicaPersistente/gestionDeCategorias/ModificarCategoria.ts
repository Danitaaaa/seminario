import { Persistencia } from '../../persistencia/Persistencia';
import { Categoria } from './entidades';
import { materializarCategoria } from './materializador';
import { ModificarCategoriaDTO } from './dto';

export class ModificarCategoria {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: ModificarCategoriaDTO): Promise<Categoria> {
    const filas = await this.persistencia.ejecutar(
      `UPDATE categorias SET nombre = $1 WHERE id = $2 RETURNING *`,
      [datos.nombre, datos.id]
    );
    return materializarCategoria(filas[0]);
  }
}
