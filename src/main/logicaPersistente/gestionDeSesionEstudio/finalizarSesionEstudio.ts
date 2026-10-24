import { Persistencia } from '../../persistencia/persistencia';
import { SesionEstudio } from './entidades';
import { SELECT_SESION_ESTUDIO } from './consultas';
import { materializarSesionEstudio } from './materializador';

// Finaliza una sesión "en_curso" (finalizar()): registra la fecha de fin real y la deja "completada".
// Si estaba pausada, el tramo de pausa se suma a segundos_pausados. El Pomodoro queda detenido.
export class FinalizarSesionEstudio {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(idUsuario: number, idSesion: number): Promise<SesionEstudio> {
    const finalizadas = await this.persistencia.ejecutar(
      `UPDATE sesion_estudio
          SET estado = 'completada',
              fecha_fin = now(),
              fecha_ultimo_acceso = now(),
              segundos_pausados = segundos_pausados
                + CASE WHEN fecha_pausa IS NULL THEN 0
                       ELSE floor(extract(epoch FROM now() - fecha_pausa))::int
                  END,
              fecha_pausa = NULL,
              pomodoro_corriendo_desde = NULL,
              pomodoro_restante_seg = NULL
        WHERE id_sesion_estudio = $1
          AND id_usuario = $2
          AND estado = 'en_curso'
        RETURNING id_sesion_estudio`,
      [idSesion, idUsuario]
    );
    if (finalizadas.length === 0) {
      throw new Error('La sesión no existe o no está en curso.');
    }

    const filas = await this.persistencia.ejecutar(
      `${SELECT_SESION_ESTUDIO} WHERE s.id_sesion_estudio = $1`,
      [idSesion]
    );
    return materializarSesionEstudio(filas[0]);
  }
}
