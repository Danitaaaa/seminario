import { Persistencia } from '../../persistencia/Persistencia';
import { Categoria } from './entidades';
import { materializarCategoria } from './materializador';
import { ListarCategoriasDTO } from './dto';

export class ListarCategorias {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: ListarCategoriasDTO): Promise<Categoria[]> {
    const filas = await this.persistencia.ejecutar(
      `SELECT * FROM categorias WHERE usuario_id = $1 ORDER BY nombre ASC`,
      [datos.usuarioId]
    );
    return filas.map(materializarCategoria);
  }
}
