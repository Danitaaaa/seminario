import { Persistencia } from '../../persistencia/persistencia';
import { HorarioCursado } from './entidades';
import { materializarHorario } from './materializador';
import { CrearHorarioDTO } from './dto';

export class CrearHorario {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: CrearHorarioDTO): Promise<HorarioCursado> {
    // Dos horarios se solapan si uno empieza antes de que el otro termine
    // Y termina después de que el otro empieza — la condición clásica de
    // intervalos superpuestos (funciona con texto "HH:MM" porque es
    // comparable alfabéticamente igual que cronológicamente, al estar
    // siempre con cero a la izquierda).
    const solapados = await this.persistencia.ejecutar(
      `SELECT titulo, hora_inicio, hora_fin FROM horarios_cursado
       WHERE usuario_id = $1 AND dia_semana = $2
         AND hora_inicio < $4 AND hora_fin > $3`,
      [datos.usuarioId, datos.diaSemana, datos.horaInicio, datos.horaFin]
    );

    if (solapados.length > 0) {
      const existente = solapados[0];
      throw new Error(
        `Ya tenés "${existente.titulo}" cargado ese día de ${existente.hora_inicio} a ${existente.hora_fin}.`
      );
    }

    const filas = await this.persistencia.ejecutar(
      `INSERT INTO horarios_cursado (usuario_id, dia_semana, hora_inicio, hora_fin, titulo)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [datos.usuarioId, datos.diaSemana, datos.horaInicio, datos.horaFin, datos.titulo]
    );
    return materializarHorario(filas[0]);
  }
}
