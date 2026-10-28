import { Persistencia } from '../../persistencia/persistencia';
import { ResumenSesiones } from './entidades';
import { ResumenSesionesDTO } from './dto';
import { materializarResumenSesiones } from './materializador';

// Tiempo realmente estudiado en una sesión terminada: de inicio a fin, menos lo que estuvo en pausa.
const MINUTOS_ESTUDIADOS = `GREATEST(0, EXTRACT(EPOCH FROM (s.fecha_fin - s.fecha_inicio)) - s.segundos_pausados) / 60`;

// Cuánto estudió el usuario y si cumplió lo que planificó, a partir de sus sesiones de estudio.
// Las fechas se agrupan en la zona horaria de la compu, no en la de Postgres (UTC).
export class ResumenSesionesEstudio {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: ResumenSesionesDTO): Promise<ResumenSesiones> {
    const valores = [datos.idUsuario, datos.desde, datos.zonaHoraria];
    // Sesiones del período según su fecha programada, en hora local.
    const delPeriodo = `s.id_usuario = $1 AND (s.fecha_programada AT TIME ZONE $3)::date >= $2::date`;

    const [totales, objetivos, porMes, porMateria] = await Promise.all([
      this.persistencia.ejecutar(
        `SELECT COUNT(*) FILTER (WHERE s.estado = 'completada')::int AS completadas,
                COUNT(*) FILTER (WHERE s.estado = 'atrasada')::int AS atrasadas,
                COALESCE(ROUND(SUM(${MINUTOS_ESTUDIADOS}) FILTER (WHERE s.fecha_fin IS NOT NULL)), 0)::int AS minutos_estudiados,
                COALESCE(SUM(s.duracion) FILTER (WHERE s.fecha_fin IS NOT NULL), 0)::int AS minutos_planificados
           FROM sesion_estudio s
          WHERE ${delPeriodo}`,
        valores
      ),
      this.persistencia.ejecutar(
        `SELECT COUNT(o.*)::int AS total,
                COUNT(o.*) FILTER (WHERE o.completado)::int AS completados
           FROM objetivo_sesion o
           JOIN sesion_estudio s ON s.id_sesion_estudio = o.id_sesion_estudio
          WHERE ${delPeriodo} AND s.estado IN ('completada', 'atrasada', 'en_curso')`,
        valores
      ),
      this.persistencia.ejecutar(
        `SELECT to_char(s.fecha_inicio AT TIME ZONE $3, 'YYYY-MM') AS mes,
                ROUND(SUM(${MINUTOS_ESTUDIADOS}))::int AS minutos
           FROM sesion_estudio s
          WHERE ${delPeriodo} AND s.fecha_fin IS NOT NULL
          GROUP BY mes
          ORDER BY mes`,
        valores
      ),
      this.persistencia.ejecutar(
        `SELECT m.nombre AS materia, ROUND(SUM(${MINUTOS_ESTUDIADOS}))::int AS minutos
           FROM sesion_estudio s
           JOIN materia m ON m.id_materia = s.id_materia
          WHERE ${delPeriodo} AND s.fecha_fin IS NOT NULL
          GROUP BY m.nombre
          ORDER BY minutos DESC, m.nombre`,
        valores
      ),
    ]);

    return materializarResumenSesiones(totales[0], objetivos[0], porMes, porMateria);
  }
}