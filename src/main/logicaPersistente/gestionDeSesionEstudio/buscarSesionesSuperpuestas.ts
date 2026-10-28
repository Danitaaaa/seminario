import { Persistencia } from '../../persistencia/persistencia';
import { SesionEstudio } from './entidades';
import { BuscarSuperpuestasDTO } from './dto';
import { SELECT_SESION_ESTUDIO } from './consultas';
import { materializarSesionEstudio } from './materializador';

// Busca las sesiones del usuario cuyo horario se cruza con el de una sesión nueva o reprogramada.
export class BuscarSesionesSuperpuestas {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(idUsuario: number, datos: BuscarSuperpuestasDTO): Promise<SesionEstudio[]> {
    const filas = await this.persistencia.ejecutar(
      `${SELECT_SESION_ESTUDIO}
        WHERE s.id_usuario = $1
          AND s.estado <> 'completada'
          AND ($4::int IS NULL OR s.id_sesion_estudio <> $4)
          AND s.fecha_programada < $2::timestamptz + make_interval(mins => $3::int)
          AND s.fecha_programada + make_interval(mins => s.duracion) > $2::timestamptz
        ORDER BY s.fecha_programada`,
      [idUsuario, datos.fechaProgramada, datos.duracion, datos.excluirIdSesion ?? null]
    );
    return filas.map(materializarSesionEstudio);
  }
}