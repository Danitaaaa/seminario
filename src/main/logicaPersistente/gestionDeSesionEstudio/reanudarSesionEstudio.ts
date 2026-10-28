import { Persistencia } from '../../persistencia/persistencia';
import { SesionEstudio } from './entidades';
import { SELECT_SESION_ESTUDIO } from './consultas';
import { materializarSesionEstudio } from './materializador';

// Reanuda una sesión pausada: el tiempo que estuvo en pausa se acumula en segundos_pausados
// para que no cuente como tiempo estudiado. El Pomodoro queda detenido hasta que se toque START.
export class ReanudarSesionEstudio {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(idUsuario: number, idSesion: number): Promise<SesionEstudio> {
    const reanudadas = await this.persistencia.ejecutar(
      `UPDATE sesion_estudio
          SET segundos_pausados = segundos_pausados
                + floor(extract(epoch FROM now() - fecha_pausa))::int,
              fecha_pausa = NULL,
              fecha_ultimo_acceso = now()
        WHERE id_sesion_estudio = $1
          AND id_usuario = $2
          AND estado = 'en_curso'
          AND fecha_pausa IS NOT NULL
        RETURNING id_sesion_estudio`,
      [idSesion, idUsuario]
    );
    if (reanudadas.length === 0) {
      throw new Error('La sesión no está pausada.');
    }

    const filas = await this.persistencia.ejecutar(
      `${SELECT_SESION_ESTUDIO} WHERE s.id_sesion_estudio = $1`,
      [idSesion]
    );
    return materializarSesionEstudio(filas[0]);
  }
}
