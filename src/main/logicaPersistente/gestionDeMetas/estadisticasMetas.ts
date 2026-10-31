import { EstadisticasMetasDTOSchema, EstadisticasMetasDTO } from './dto';
import { EstadisticasMetas } from './entidades';
import { mesAFecha } from './materializador';
import { IPersistenciaProyectos } from '../gestionDeProyectos/interfacesSincronizacion';
import { exigirAcceso, filtroAlcance } from '../gestionDeProyectos/alcance';

// Cumplimiento por mes y aporte por miembro, calculados directamente sobre la tabla `metas`.
// Con idProyecto: estadísticas del proyecto. Sin idProyecto: las de las metas personales del usuario.
// Las pendientes trasladadas a otro mes no cuentan como incumplidas: se informan aparte.
export class EstadisticasMetasProyecto {
    constructor(private persistencia: IPersistenciaProyectos) {}

    async ejecutar(entrada: EstadisticasMetasDTO): Promise<EstadisticasMetas> {
        const dto = EstadisticasMetasDTOSchema.parse(entrada);
        const idProyecto = dto.idProyecto ?? null;
        await exigirAcceso(this.persistencia, idProyecto, dto.idUsuario, dto.idUsuario,
            'meta.listar');

        const valores: unknown[] = [];
        const filtros = [filtroAlcance(valores, idProyecto, dto.idUsuario)];
        if (dto.desde) { valores.push(mesAFecha(dto.desde)); filtros.push(`mes >= $${valores.length}::date`); }
        if (dto.hasta) { valores.push(mesAFecha(dto.hasta)); filtros.push(`mes <= $${valores.length}::date`); }
        const donde = filtros.join(' AND ');

        const porMes = await this.persistencia.ejecutar(
            `SELECT to_char(mes, 'YYYY-MM') AS mes,
                    (COUNT(*) FILTER (WHERE NOT trasladada))::int AS total,
                    (COUNT(*) FILTER (WHERE completada AND NOT trasladada))::int AS completadas,
                    (COUNT(*) FILTER (WHERE trasladada))::int AS trasladadas
             FROM (SELECT m.*,
                          (NOT m.completada AND EXISTS
                            (SELECT 1 FROM metas t WHERE t.id_meta_origen = m.id_meta)) AS trasladada
                   FROM metas m WHERE ${donde}) x
             GROUP BY mes ORDER BY mes`, valores);

        const porMiembro = await this.persistencia.ejecutar(
            `SELECT completada_por_global AS id_usuario, COUNT(*)::int AS completadas
             FROM metas WHERE ${donde} AND completada AND completada_por_global IS NOT NULL
             GROUP BY completada_por_global ORDER BY completadas DESC`, valores);

        return {
            porMes: porMes.map(f => ({
                mes: f.mes, total: f.total, completadas: f.completadas, trasladadas: f.trasladadas,
            })),
            porMiembro: porMiembro.map(f => ({ idUsuario: f.id_usuario, completadas: f.completadas })),
        };
    }
}