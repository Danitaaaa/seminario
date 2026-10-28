import { Persistencia } from '../../persistencia/persistencia';
import { SesionEstudio } from './entidades';
import { SELECT_SESION_ESTUDIO } from './consultas';
import { materializarSesionEstudio } from './materializador';

// Código de Postgres para violación de índice único.
const VIOLACION_UNICIDAD = '23505';

// Inicia una sesión "sin_empezar" o "atrasada" y la pasa a "en_curso".
// El índice único parcial de la base garantiza que haya una sola sesión en curso por usuario.
export class IniciarSesionEstudio {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(idUsuario: number, idSesion: number): Promise<SesionEstudio> {
    let iniciadas: any[];
    try {
      iniciadas = await this.persistencia.ejecutar(
        `UPDATE sesion_estudio
            SET estado = 'en_curso',
                fecha_inicio = now(),
                fecha_ultimo_acceso = now()
          WHERE id_sesion_estudio = $1
            AND id_usuario = $2
            AND estado IN ('sin_empezar', 'atrasada')
          RETURNING id_sesion_estudio`,
        [idSesion, idUsuario]
      );
    } catch (error: any) {
      if (error?.code === VIOLACION_UNICIDAD) {
        throw new Error('Ya tenés una sesión de estudio en curso. Finalizala antes de iniciar otra.');
      }
      throw error;
    }

    if (iniciadas.length === 0) {
      throw new Error('La sesión no existe o ya fue iniciada.');
    }

    const filas = await this.persistencia.ejecutar(
      `${SELECT_SESION_ESTUDIO} WHERE s.id_sesion_estudio = $1`,
      [idSesion]
    );
    return materializarSesionEstudio(filas[0]);
  }
}
