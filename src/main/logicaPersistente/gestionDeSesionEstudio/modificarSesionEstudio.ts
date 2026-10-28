import { Persistencia } from '../../persistencia/persistencia';
import { SesionEstudio } from './entidades';
import { ModificarSesionEstudioDTO } from './dto';
import { SELECT_SESION_ESTUDIO } from './consultas';
import { materializarSesionEstudio } from './materializador';
import { exigirMazoPropio } from './mazoDeSesion';

// Modifica nombre, materia, duración, fecha programada, notificación, minutos del Pomodoro, métodos o mazo de flashcards de una sesión (CU12, modificar()).
// Si la sesión estaba "atrasada" y la nueva fecha aún no venció, vuelve a "sin_empezar".
export class ModificarSesionEstudio {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(idUsuario: number, datos: ModificarSesionEstudioDTO): Promise<SesionEstudio> {
    await exigirMazoPropio(this.persistencia, idUsuario, datos.idDeck);
    const modificadas = await this.persistencia.ejecutar(
      `UPDATE sesion_estudio
          SET nombre = COALESCE($3::varchar, nombre),
              duracion = COALESCE($4::int, duracion),
              fecha_programada = COALESCE($5::timestamptz, fecha_programada),
              recibir_notificacion = COALESCE($6::boolean, recibir_notificacion),
              pomodoro_min = COALESCE($7::int, pomodoro_min),
              descanso_corto_min = COALESCE($8::int, descanso_corto_min),
              descanso_largo_min = COALESCE($9::int, descanso_largo_min),
              id_materia = COALESCE($10::int, id_materia),
              -- El mazo se puede quitar (null): por eso se avisa aparte si vino en los datos.
              id_deck = CASE WHEN $11::boolean THEN $12::int ELSE id_deck END,
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
        datos.idMateria ?? null,
        datos.idDeck !== undefined,
        datos.idDeck ?? null,
      ]
    );
    if (modificadas.length === 0) {
      throw new Error('La sesión de estudio no existe.');
    }

    // Deja exactamente los métodos elegidos: borra los que se sacaron y agrega los nuevos.
    if (datos.idsMetodosEstudio !== undefined) {
      const idsMetodos = [...new Set(datos.idsMetodosEstudio)];
      await this.persistencia.ejecutar(
        `WITH sacados AS (
           DELETE FROM sesion_estudio_metodo_estudio
            WHERE id_sesion_estudio = $1 AND NOT (id_tipo_metodo_estudio = ANY($2::int[]))
         )
         INSERT INTO sesion_estudio_metodo_estudio (id_sesion_estudio, id_tipo_metodo_estudio)
         SELECT $1, m FROM unnest($2::int[]) AS m
         ON CONFLICT DO NOTHING`,
        [datos.idSesion, idsMetodos]
      );
    }

    const filas = await this.persistencia.ejecutar(
      `${SELECT_SESION_ESTUDIO} WHERE s.id_sesion_estudio = $1`,
      [datos.idSesion]
    );
    return materializarSesionEstudio(filas[0]);
  }
}
