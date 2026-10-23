import { Persistencia } from '../../persistencia/persistencia';
import { SesionEstudio } from './entidades';
import { SELECT_SESION_ESTUDIO } from './consultas';
import { materializarSesionEstudio } from './materializador';

// Finaliza una sesión "en_curso" (finalizar()): registra la fecha de fin real y la deja "completada".
export class FinalizarSesionEstudio {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(idUsuario: number, idSesion: number): Promise<SesionEstudio> {
    const finalizadas = await this.persistencia.ejecutar(
      `UPDATE sesion_estudio
          SET estado = 'completada',
              fecha_fin = now(),
              fecha_ultimo_acceso = now()
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
