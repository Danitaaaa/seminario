import { Persistencia } from '../../persistencia/persistencia';
import { SesionEstudio } from './entidades';
import { ListarSesionesEstudioDTO } from './dto';
import { SELECT_SESION_ESTUDIO } from './consultas';
import { materializarSesionEstudio } from './materializador';

// Lista las sesiones del usuario, ordenadas por fecha programada.
// Con desde/hasta sirve también para mostrarlas en el calendario.
export class ListarSesionesEstudio {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(idUsuario: number, filtros: ListarSesionesEstudioDTO): Promise<SesionEstudio[]> {
    const filas = await this.persistencia.ejecutar(
      `${SELECT_SESION_ESTUDIO}
        WHERE s.id_usuario = $1
          AND ($2::timestamptz IS NULL OR s.fecha_programada >= $2)
          AND ($3::timestamptz IS NULL OR s.fecha_programada <= $3)
        ORDER BY s.fecha_programada, s.id_sesion_estudio`,
      [idUsuario, filtros.desde ?? null, filtros.hasta ?? null]
    );
    return filas.map(materializarSesionEstudio);
  }
}
