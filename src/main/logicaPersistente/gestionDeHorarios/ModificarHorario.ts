import { Persistencia } from '../../persistencia/Persistencia';
import { HorarioCursado } from './entidades';
import { materializarHorario } from './materializador';
import { ModificarHorarioDTO } from './dto';

export class ModificarHorario {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: ModificarHorarioDTO): Promise<HorarioCursado> {
    const campos: string[] = [];
    const valores: unknown[] = [];

    const agregar = (columna: string, valor: unknown): void => {
      if (valor !== undefined) {
        valores.push(valor);
        campos.push(`${columna} = $${valores.length}`);
      }
    };

    agregar('dia_semana', datos.diaSemana);
    agregar('hora_inicio', datos.horaInicio);
    agregar('titulo', datos.titulo);

    valores.push(datos.id);

    const filas = await this.persistencia.ejecutar(
      `UPDATE horarios_cursado SET ${campos.join(', ')} WHERE id = $${valores.length} RETURNING *`,
      valores
    );
    return materializarHorario(filas[0]);
  }
}
