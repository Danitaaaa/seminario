import { Persistencia } from '../../persistencia/Persistencia';
import { Categoria } from './entidades';
import { materializarCategoria } from './materializador';
import { CrearCategoriaDTO } from './dto';

export class CrearCategoria {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: CrearCategoriaDTO): Promise<Categoria> {
    const filas = await this.persistencia.ejecutar(
      `INSERT INTO categorias (usuario_id, nombre) VALUES ($1, $2) RETURNING *`,
      [datos.usuarioId, datos.nombre]
    );
    return materializarCategoria(filas[0]);
  }
}
