import { Persistencia } from '../../persistencia/persistencia';
import { CargaDelDia } from './entidades';

// Lo estudiado de verdad: de inicio a fin (o hasta ahora si sigue en curso), menos las pausas.
const MINUTOS_ESTUDIADOS = `GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(s.fecha_fin, now()) - s.fecha_inicio)) - s.segundos_pausados) / 60`;

// Sesiones de un día (de `desde` a `hasta`, en la hora de la compu) y cuánto se estudió en ellas.
export class ObtenerCargaDelDia {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(usuarioId: number, desde: Date, hasta: Date): Promise<CargaDelDia> {
    const [fila] = await this.persistencia.ejecutar(
      `SELECT COUNT(*)::int AS sesiones,
              COALESCE(SUM(s.duracion), 0)::int AS minutos_planificados,
              COALESCE(ROUND(SUM(${MINUTOS_ESTUDIADOS}) FILTER (WHERE s.fecha_inicio IS NOT NULL)), 0)::int AS minutos_estudiados
         FROM sesion_estudio s
        WHERE s.id_usuario = $1 AND s.fecha_programada >= $2 AND s.fecha_programada < $3`,
      [usuarioId, desde, hasta]
    );
    return {
      sesiones: fila?.sesiones ?? 0,
      minutosPlanificados: fila?.minutos_planificados ?? 0,
      minutosEstudiados: fila?.minutos_estudiados ?? 0,
    };
  }
}
