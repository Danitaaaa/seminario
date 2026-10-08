import { Persistencia } from '../../persistencia/Persistencia';
import { EliminarEventoDTO } from './dto';

export class EliminarEvento {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: EliminarEventoDTO): Promise<void> {
    await this.persistencia.ejecutar(`DELETE FROM eventos WHERE id = $1`, [datos.id]);
  }
}