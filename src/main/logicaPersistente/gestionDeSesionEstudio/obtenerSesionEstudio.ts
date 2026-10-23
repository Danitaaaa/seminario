import { Persistencia } from '../../persistencia/persistencia';
import { SesionEstudio } from './entidades';
import { SELECT_SESION_ESTUDIO } from './consultas';
import { materializarSesionEstudio } from './materializador';

// Abre una sesión: actualiza su último acceso y la devuelve completa.
// Solo encuentra sesiones del usuario que la pide.
export class ObtenerSesionEstudio {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(idUsuario: number, idSesion: number): Promise<SesionEstudio> {
    const actualizadas = await this.persistencia.ejecutar(
      `UPDATE sesion_estudio
          SET fecha_ultimo_acceso = now()
        WHERE id_sesion_estudio = $1 AND id_usuario = $2
        RETURNING id_sesion_estudio`,
      [idSesion, idUsuario]
    );
    if (actualizadas.length === 0) {
      throw new Error('La sesión de estudio no existe.');
    }

    const filas = await this.persistencia.ejecutar(
      `${SELECT_SESION_ESTUDIO} WHERE s.id_sesion_estudio = $1`,
      [idSesion]
    );
    return materializarSesionEstudio(filas[0]);
  }
}
