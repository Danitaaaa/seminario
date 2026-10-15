import { Persistencia } from '../../persistencia/persistencia';
import { HorarioCursado } from './entidades';
import { materializarHorario } from './materializador';
import { ListarHorariosDTO } from './dto';

export class ListarHorarios {
  constructor(private readonly persistencia: Persistencia) {}

  // No recibe rango de fechas, a diferencia de ListarEventos: un horario de
  // cursada no "pertenece" a un mes, se repite siempre, así que se trae la
  // lista completa del usuario una sola vez.
  async ejecutar(datos: ListarHorariosDTO): Promise<HorarioCursado[]> {
    const filas = await this.persistencia.ejecutar(
      `SELECT * FROM horarios_cursado WHERE usuario_id = $1 ORDER BY dia_semana ASC, hora_inicio ASC`,
      [datos.usuarioId]
    );
    return filas.map(materializarHorario);
  }
}
