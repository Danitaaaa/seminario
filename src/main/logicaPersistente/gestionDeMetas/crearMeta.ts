import { Persistencia } from '../../persistencia/persistencia';
import { Meta } from './entidades';
import { materializarMeta } from './materializador';
import { CrearMetaDTO } from './dto';

// Crea una meta nueva sin completar
export class CrearMeta {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: CrearMetaDTO): Promise<Meta> {
    const filas = await this.persistencia.ejecutar(
      `INSERT INTO metas (usuario_id, titulo, fecha_limite) VALUES ($1, $2, $3) RETURNING *`,
      [datos.usuarioId, datos.titulo, datos.fechaLimite]
    );
    return materializarMeta(filas[0]);
  }
}