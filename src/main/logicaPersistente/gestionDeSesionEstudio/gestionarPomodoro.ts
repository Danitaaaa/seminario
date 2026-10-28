import { Persistencia } from '../../persistencia/persistencia';
import { FasePomodoro, SesionEstudio } from './entidades';
import { SELECT_SESION_ESTUDIO, SEGUNDOS_RESTANTES_POMODORO } from './consultas';
import { materializarSesionEstudio } from './materializador';

// Cantidad de pomodoros antes del descanso largo.
const POMODOROS_POR_CICLO = 4;

// Controles del panel Pomodoro: START/PAUSA, reiniciar, elegir fase y pasar a la siguiente.
// El estado se guarda en la sesión, así recargar la pantalla o reiniciar la app no lo pierde.
// Solo se puede correr con la sesión en curso y sin pausar.
export class GestionarPomodoro {
  constructor(private readonly persistencia: Persistencia) {}

  // START: arranca a contar desde los segundos que le quedaban a la fase.
  async iniciar(idUsuario: number, idSesion: number): Promise<SesionEstudio> {
    const filas = await this.persistencia.ejecutar(
      `UPDATE sesion_estudio
          SET pomodoro_corriendo_desde = now()
        WHERE id_sesion_estudio = $1 AND id_usuario = $2
          AND estado = 'en_curso' AND fecha_pausa IS NULL
          AND pomodoro_corriendo_desde IS NULL
        RETURNING id_sesion_estudio`,
      [idSesion, idUsuario]
    );
    if (filas.length === 0) {
      throw new Error('Iniciá o reanudá la sesión para usar el Pomodoro.');
    }
    return this.obtener(idSesion);
  }

  // PAUSA: detiene el Pomodoro guardando los segundos que le quedan.
  async pausar(idUsuario: number, idSesion: number): Promise<SesionEstudio> {
    await this.persistencia.ejecutar(
      `UPDATE sesion_estudio
          SET pomodoro_restante_seg = ${SEGUNDOS_RESTANTES_POMODORO},
              pomodoro_corriendo_desde = NULL
        WHERE id_sesion_estudio = $1 AND id_usuario = $2
          AND pomodoro_corriendo_desde IS NOT NULL`,
      [idSesion, idUsuario]
    );
    return this.obtenerDelUsuario(idUsuario, idSesion);
  }

  // Reiniciar: vuelve la fase actual a su duración completa y la deja detenida.
  async reiniciar(idUsuario: number, idSesion: number): Promise<SesionEstudio> {
    await this.persistencia.ejecutar(
      `UPDATE sesion_estudio
          SET pomodoro_restante_seg = NULL,
              pomodoro_corriendo_desde = NULL
        WHERE id_sesion_estudio = $1 AND id_usuario = $2`,
      [idSesion, idUsuario]
    );
    return this.obtenerDelUsuario(idUsuario, idSesion);
  }

  // Elige la fase (Pomodoro, Short Break o Long Break). Queda completa y detenida.
  async cambiarFase(idUsuario: number, idSesion: number, fase: FasePomodoro): Promise<SesionEstudio> {
    await this.persistencia.ejecutar(
      `UPDATE sesion_estudio
          SET pomodoro_fase = $3,
              pomodoro_restante_seg = NULL,
              pomodoro_corriendo_desde = NULL
        WHERE id_sesion_estudio = $1 AND id_usuario = $2`,
      [idSesion, idUsuario, fase]
    );
    return this.obtenerDelUsuario(idUsuario, idSesion);
  }

  // Cuando la fase llega a cero pasa a la siguiente: tras un pomodoro va un descanso corto
  // (o largo cada 4) y tras un descanso vuelve el pomodoro. La nueva fase arranca sola.
  // La condición sobre el tiempo hace que llamarlo dos veces no avance dos fases.
  // Devuelve null si la fase todavía no terminó.
  async completarFase(idSesion: number): Promise<SesionEstudio | null> {
    const filas = await this.persistencia.ejecutar(
      `UPDATE sesion_estudio
          SET pomodoros_completados = pomodoros_completados
                + CASE WHEN pomodoro_fase = 'pomodoro' THEN 1 ELSE 0 END,
              pomodoro_fase = CASE
                WHEN pomodoro_fase <> 'pomodoro' THEN 'pomodoro'
                WHEN (pomodoros_completados + 1) % $2 = 0 THEN 'descanso_largo'
                ELSE 'descanso_corto'
              END,
              pomodoro_restante_seg = NULL,
              pomodoro_corriendo_desde = now()
        WHERE id_sesion_estudio = $1
          AND estado = 'en_curso' AND fecha_pausa IS NULL
          AND pomodoro_corriendo_desde IS NOT NULL
          AND ${SEGUNDOS_RESTANTES_POMODORO} = 0
        RETURNING id_sesion_estudio`,
      [idSesion, POMODOROS_POR_CICLO]
    );
    return filas.length === 0 ? null : this.obtener(idSesion);
  }

  private async obtenerDelUsuario(idUsuario: number, idSesion: number): Promise<SesionEstudio> {
    const filas = await this.persistencia.ejecutar(
      `${SELECT_SESION_ESTUDIO} WHERE s.id_sesion_estudio = $1 AND s.id_usuario = $2`,
      [idSesion, idUsuario]
    );
    if (filas.length === 0) throw new Error('La sesión de estudio no existe.');
    return materializarSesionEstudio(filas[0]);
  }

  private async obtener(idSesion: number): Promise<SesionEstudio> {
    const filas = await this.persistencia.ejecutar(
      `${SELECT_SESION_ESTUDIO} WHERE s.id_sesion_estudio = $1`,
      [idSesion]
    );
    return materializarSesionEstudio(filas[0]);
  }
}
