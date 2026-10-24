import { Persistencia } from '../../persistencia/persistencia';
import { SesionEstudio } from './entidades';
import { ModificarSesionEstudioDTO } from './dto';
import { SELECT_SESION_ESTUDIO } from './consultas';
import { materializarSesionEstudio } from './materializador';

// Modifica nombre, duración, fecha programada, notificación o minutos del Pomodoro de una sesión (CU12, modificar()).
// Si la sesión estaba "atrasada" y la nueva fecha aún no venció, vuelve a "sin_empezar".
export class ModificarSesionEstudio {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(idUsuario: number, datos: ModificarSesionEstudioDTO): Promise<SesionEstudio> {
    const modificadas = await this.persistencia.ejecutar(
      `UPDATE sesion_estudio
          SET nombre = COALESCE($3::varchar, nombre),
              duracion = COALESCE($4::int, duracion),
              fecha_programada = COALESCE($5::timestamptz, fecha_programada),
              recibir_notificacion = COALESCE($6::boolean, recibir_notificacion),
              pomodoro_min = COALESCE($7::int, pomodoro_min),
              descanso_corto_min = COALESCE($8::int, descanso_corto_min),
              descanso_largo_min = COALESCE($9::int, descanso_largo_min),
              estado = CASE
                WHEN estado = 'atrasada'
                 AND COALESCE($5::timestamptz, fecha_programada)
                     + make_interval(mins => COALESCE($4::int, duracion)) >= now()
                THEN 'sin_empezar'
                ELSE estado
              END
        WHERE id_sesion_estudio = $1 AND id_usuario = $2
        RETURNING id_sesion_estudio`,
      [
        datos.idSesion,
        idUsuario,
        datos.nombre ?? null,
        datos.duracion ?? null,
        datos.fechaProgramada ?? null,
        datos.recibirNotificacion ?? null,
        datos.pomodoroMin ?? null,
        datos.descansoCortoMin ?? null,
        datos.descansoLargoMin ?? null,
      ]
    );
    if (modificadas.length === 0) {
      throw new Error('La sesión de estudio no existe.');
    }

    const filas = await this.persistencia.ejecutar(
      `${SELECT_SESION_ESTUDIO} WHERE s.id_sesion_estudio = $1`,
      [datos.idSesion]
    );
    return materializarSesionEstudio(filas[0]);
  }
}
