import { Persistencia } from '../../persistencia/persistencia';
import { CuatrimestreCursada } from './entidades';
import { materializarCuatrimestre } from './materializador';
import { UsuarioDTO } from './dto';

// Los cuatrimestres del usuario, del más nuevo al más viejo, con sus recesos.
export class ListarCuatrimestres {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: UsuarioDTO, idCuatrimestre?: number): Promise<CuatrimestreCursada[]> {
    const filas = await this.persistencia.ejecutar(
      `SELECT c.id_cuatrimestre, c.anio, c.tipo,
              to_char(c.fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio, to_char(c.fecha_fin, 'YYYY-MM-DD') AS fecha_fin,
              COALESCE((SELECT json_agg(json_build_object(
                         'desde', to_char(r.desde, 'YYYY-MM-DD'), 'hasta', to_char(r.hasta, 'YYYY-MM-DD'),
                         'descripcion', r.descripcion) ORDER BY r.desde)
                          FROM cuatrimestre_receso r WHERE r.id_cuatrimestre = c.id_cuatrimestre), '[]') AS recesos,
              (SELECT count(*) FROM horarios_cursado h WHERE h.id_cuatrimestre = c.id_cuatrimestre)::int AS horarios,
              (SELECT count(*) FROM cuaderno cu WHERE cu.id_cuatrimestre = c.id_cuatrimestre)::int AS cuadernos
         FROM cuatrimestre c
        WHERE c.id_usuario = $1 AND ($2::int IS NULL OR c.id_cuatrimestre = $2)
        ORDER BY c.fecha_inicio DESC`,
      [datos.usuarioId, idCuatrimestre ?? null]
    );
    return filas.map(materializarCuatrimestre);
  }
}
