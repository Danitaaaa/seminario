import { Persistencia } from '../../persistencia/persistencia';
import { Meta } from './entidades';
import { materializarMeta } from './materializador';
import { ListarMetasDTO } from './dto';

// Lista las metas del usuario en el orden en que las fue anotando
export class ListarMetas {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: ListarMetasDTO): Promise<Meta[]> {
    const filas = await this.persistencia.ejecutar(
      `SELECT * FROM metas WHERE usuario_id = $1 ORDER BY fecha_creacion ASC, id ASC`,
      [datos.usuarioId]
    );
    return filas.map(materializarMeta);
  }
}