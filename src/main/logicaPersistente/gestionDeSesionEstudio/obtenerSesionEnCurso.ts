import { Persistencia } from '../../persistencia/persistencia';
import { SesionEstudio } from './entidades';
import { SELECT_SESION_ESTUDIO } from './consultas';
import { materializarSesionEstudio } from './materializador';

// Devuelve la sesión en curso del usuario, o null si no tiene ninguna.
export class ObtenerSesionEnCurso {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(idUsuario: number): Promise<SesionEstudio | null> {
    const filas = await this.persistencia.ejecutar(
      `${SELECT_SESION_ESTUDIO} WHERE s.id_usuario = $1 AND s.estado = 'en_curso'`,
      [idUsuario]
    );
    return filas.length === 0 ? null : materializarSesionEstudio(filas[0]);
  }
}
