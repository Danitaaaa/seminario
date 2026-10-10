import { Persistencia } from '../../persistencia/Persistencia';
import { HorarioCursado } from './entidades';
import { materializarHorario } from './materializador';
import { ModificarHorarioDTO } from './dto';

export class ModificarHorario {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: ModificarHorarioDTO): Promise<HorarioCursado> {
    // Como diaSemana/horaInicio/horaFin son todos opcionales acá (solo se
    // actualiza lo que llega), primero traemos la fila actual para saber
    // los valores "finales" con los que hay que chequear superposición y
    // el orden inicio < fin — no alcanza con mirar solo lo que cambió.
    const filaActual = await this.persistencia.ejecutar(
      `SELECT * FROM horarios_cursado WHERE id = $1`,
      [datos.id]
    );
    const actual = filaActual[0];
    const diaSemana = datos.diaSemana ?? actual.dia_semana;
    const horaInicio = datos.horaInicio ?? actual.hora_inicio;
    const horaFin = datos.horaFin ?? actual.hora_fin;

    if (horaFin <= horaInicio) {
      throw new Error('La hora de fin debe ser posterior a la hora de inicio.');
    }

    const solapados = await this.persistencia.ejecutar(
      `SELECT titulo, hora_inicio, hora_fin FROM horarios_cursado
       WHERE usuario_id = $1 AND dia_semana = $2
         AND hora_inicio < $4 AND hora_fin > $3 AND id != $5`,
      [actual.usuario_id, diaSemana, horaInicio, horaFin, datos.id]
    );
    if (solapados.length > 0) {
      const existente = solapados[0];
      throw new Error(
        `Ya tenés "${existente.titulo}" cargado ese día de ${existente.hora_inicio} a ${existente.hora_fin}.`
      );
    }

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
    agregar('hora_fin', datos.horaFin);
    agregar('titulo', datos.titulo);
    valores.push(datos.id);

    const filas = await this.persistencia.ejecutar(
      `UPDATE horarios_cursado SET ${campos.join(', ')} WHERE id = $${valores.length} RETURNING *`,
      valores
    );
    return materializarHorario(filas[0]);
  }
}
