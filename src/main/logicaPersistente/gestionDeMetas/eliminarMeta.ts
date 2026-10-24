import { Persistencia } from '../../persistencia/persistencia';
import { EliminarMetaDTO } from './dto';

// Elimina una meta. Solo borra metas del propio usuario.
export class EliminarMeta {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: EliminarMetaDTO): Promise<void> {
    const filas = await this.persistencia.ejecutar(
      `DELETE FROM metas WHERE id = $1 AND usuario_id = $2 RETURNING id`,
      [datos.id, datos.usuarioId]
    );
    if (filas.length === 0) throw new Error('La meta no existe.');
  }
}