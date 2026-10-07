import { Persistencia } from '../../persistencia/Persistencia';
import { HorarioCursado } from './entidades';
import { materializarHorario } from './materializador';
import { CrearHorarioDTO } from './dto';

export class CrearHorario {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: CrearHorarioDTO): Promise<HorarioCursado> {
    const filas = await this.persistencia.ejecutar(
      `INSERT INTO horarios_cursado (usuario_id, dia_semana, hora_inicio, titulo)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [datos.usuarioId, datos.diaSemana, datos.horaInicio, datos.titulo]
    );
    return materializarHorario(filas[0]);
  }
}
