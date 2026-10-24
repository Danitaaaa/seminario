import { Persistencia } from '../../persistencia/persistencia';
import { SesionEstudio } from './entidades';
import { SELECT_SESION_ESTUDIO, SEGUNDOS_RESTANTES_POMODORO } from './consultas';
import { materializarSesionEstudio } from './materializador';

// Pausa una sesión en curso: el reloj de la sesión deja de contar y el Pomodoro, si corría,
// se detiene guardando los segundos que le quedaban.
export class PausarSesionEstudio {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(idUsuario: number, idSesion: number): Promise<SesionEstudio> {
    const pausadas = await this.persistencia.ejecutar(
      `UPDATE sesion_estudio
          SET fecha_pausa = now(),
              fecha_ultimo_acceso = now(),
              pomodoro_restante_seg = CASE WHEN pomodoro_corriendo_desde IS NULL
                                           THEN pomodoro_restante_seg
                                           ELSE ${SEGUNDOS_RESTANTES_POMODORO}
                                      END,
              pomodoro_corriendo_desde = NULL
        WHERE id_sesion_estudio = $1
          AND id_usuario = $2
          AND estado = 'en_curso'
          AND fecha_pausa IS NULL
        RETURNING id_sesion_estudio`,
      [idSesion, idUsuario]
    );
    if (pausadas.length === 0) {
      throw new Error('La sesión no está en curso o ya está pausada.');
    }

    const filas = await this.persistencia.ejecutar(
      `${SELECT_SESION_ESTUDIO} WHERE s.id_sesion_estudio = $1`,
      [idSesion]
    );
    return materializarSesionEstudio(filas[0]);
  }
}
