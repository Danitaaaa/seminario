import { Persistencia } from '../../persistencia/persistencia';
import { Meta } from './entidades';
import { materializarMeta } from './materializador';
import { CompletarMetaDTO } from './dto';

// Tacha o destacha una meta. Solo cambia metas del propio usuario.
export class CompletarMeta {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: CompletarMetaDTO): Promise<Meta> {
    const filas = await this.persistencia.ejecutar(
      `UPDATE metas SET completada = $1 WHERE id = $2 AND usuario_id = $3 RETURNING *`,
      [datos.completada, datos.id, datos.usuarioId]
    );
    if (filas.length === 0) throw new Error('La meta no existe.');
    return materializarMeta(filas[0]);
  }
}