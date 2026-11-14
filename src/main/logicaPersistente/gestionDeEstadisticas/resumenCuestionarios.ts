import { Persistencia } from '../../persistencia/persistencia';
import { ResumenCuestionarios } from './entidades';
import { FORMATO_AGRUPAR, ResumenCuestionariosDTO } from './dto';
import { materializarResumenCuestionarios } from './materializador';

// fecha la pone Postgres con now() (UTC): se pasa a la hora de la compu antes de agrupar.
const FECHA_LOCAL = `(i.fecha + make_interval(mins => $3::int))`;
const porcentaje = (correctas: string, total: string) => `COALESCE(ROUND(100.0 * ${correctas} / NULLIF(${total}, 0)), 0)::int`;

// Cómo le va al usuario en los cuestionarios con IA: cuántos resolvió, % de aciertos por mes,
// en qué temas se equivoca más y el resultado de los últimos cuestionarios.
export class ResumenDeCuestionarios {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: ResumenCuestionariosDTO): Promise<ResumenCuestionarios> {
    const valores = [datos.idUsuario, datos.desde, datos.desfaseMinutos];
    const delPeriodo = `i.id_usuario = $1 AND ${FECHA_LOCAL}::date >= $2::date`;

    const [[totales], porMes, temas, recientes] = await Promise.all([
      this.persistencia.ejecutar(
        `SELECT COUNT(*)::int AS intentos,
                COUNT(DISTINCT i.id_material_ia)::int AS cuestionarios,
                COALESCE(SUM(i.correctas), 0)::int AS correctas,
                COALESCE(SUM(i.total), 0)::int AS preguntas
           FROM intentos_cuestionario i
          WHERE ${delPeriodo}`,
        valores
      ),
      this.persistencia.ejecutar(
        `SELECT to_char(${FECHA_LOCAL}, '${FORMATO_AGRUPAR[datos.agrupar]}') AS mes,
                ${porcentaje('SUM(i.correctas)', 'SUM(i.total)')} AS porcentaje,
                COUNT(*)::int AS intentos
           FROM intentos_cuestionario i
          WHERE ${delPeriodo}
          GROUP BY mes
          ORDER BY mes`,
        valores
      ),
      this.persistencia.ejecutar(
        `SELECT t.tema, SUM(t.errores)::int AS errores, SUM(t.total)::int AS total
           FROM intentos_cuestionario i
           CROSS JOIN LATERAL jsonb_to_recordset(i.temas_a_reforzar) AS t(tema text, errores int, total int)
          WHERE ${delPeriodo} AND t.errores > 0
          GROUP BY t.tema
          ORDER BY errores DESC, t.tema
          LIMIT 6`,
        valores
      ),
      this.persistencia.ejecutar(
        `SELECT m.id_material_ia, m.titulo, COUNT(*)::int AS intentos,
                (ARRAY_AGG(${porcentaje('i.correctas', 'i.total')} ORDER BY i.fecha DESC))[1] AS ultimo,
                MAX(${porcentaje('i.correctas', 'i.total')}) AS mejor,
                MAX(i.fecha) AS ultima_fecha
           FROM intentos_cuestionario i
           JOIN materiales_ia m ON m.id_material_ia = i.id_material_ia
          WHERE ${delPeriodo}
          GROUP BY m.id_material_ia, m.titulo
          ORDER BY ultima_fecha DESC
          LIMIT 5`,
        valores
      ),
    ]);

    return materializarResumenCuestionarios(totales, porMes, temas, recientes);
  }
}
