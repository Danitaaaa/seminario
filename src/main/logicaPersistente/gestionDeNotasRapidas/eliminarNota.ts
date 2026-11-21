import { Persistencia } from '../../persistencia/persistencia';
import { EliminarNotaDTO } from './dto';

export class EliminarNota {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: EliminarNotaDTO): Promise<void> {
    await this.persistencia.ejecutar(`DELETE FROM notas_rapidas WHERE id_nota = $1 AND id_usuario = $2`, [datos.idNota, datos.usuarioId]);
  }
}
