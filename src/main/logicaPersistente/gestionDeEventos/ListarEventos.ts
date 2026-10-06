import { Persistencia } from '../../persistencia/Persistencia';
import { Evento } from './entidades';
import { materializarEvento } from './materializador';
import { ListarEventosDTO } from './dto';

export class ListarEventos {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: ListarEventosDTO): Promise<Evento[]> {
    const condiciones = ['usuario_id = $1'];
    const valores: unknown[] = [datos.usuarioId];

    if (datos.desde) {
      valores.push(datos.desde);
      condiciones.push(`fecha >= $${valores.length}`);
    }
    if (datos.hasta) {
      valores.push(datos.hasta);
      condiciones.push(`fecha <= $${valores.length}`);
    }

    const filas = await this.persistencia.ejecutar(
      `SELECT * FROM eventos WHERE ${condiciones.join(' AND ')} ORDER BY fecha ASC`,
      valores
    );
    return filas.map(materializarEvento);
  }
}