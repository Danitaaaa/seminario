import { Persistencia } from '../../persistencia/persistencia';
import { EliminarHorarioDTO } from './dto';

export class EliminarHorario {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: EliminarHorarioDTO): Promise<void> {
    await this.persistencia.ejecutar(`DELETE FROM horarios_cursado WHERE id = $1`, [datos.id]);
  }
}
