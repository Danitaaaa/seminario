import { Persistencia } from '../../persistencia/persistencia';
import { EliminarHorarioDTO } from './dto';

// Elimina el horario con el ID indicado
export class EliminarHorario {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: EliminarHorarioDTO): Promise<void> {
    await this.persistencia.ejecutar(`DELETE FROM horarios_cursado WHERE id = $1`, [datos.id]);
  }
}
