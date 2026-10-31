import { ListarMetasDTOSchema, ListarMetasDTO } from './dto';
import { Meta } from './entidades';
import { COLUMNAS_META, materializarMeta, mesAFecha } from './materializador';
import { IPersistenciaProyectos } from '../gestionDeProyectos/interfacesSincronizacion';
import { exigirAcceso, filtroAlcance } from '../gestionDeProyectos/alcance';

// Lista las metas de un mes, en el orden definido por el usuario,
// o las que vencen entre dos fechas (ordenadas por fecha), para el cronograma y los avisos.
// Con idProyecto: las del proyecto. Sin idProyecto: las metas personales del usuario.
export class ListarMetas {
    constructor(private persistencia: IPersistenciaProyectos) {}

    async ejecutar(entrada: ListarMetasDTO): Promise<Meta[]> {
        const dto = ListarMetasDTOSchema.parse(entrada);
        const idProyecto = dto.idProyecto ?? null;
        await exigirAcceso(this.persistencia, idProyecto, dto.idUsuario, dto.idUsuario,
            'meta.listar');

        const valores: unknown[] = [];
        const alcance = filtroAlcance(valores, idProyecto, dto.idUsuario);
        let filtro: string;
        let orden: string;
        if (dto.mes !== undefined) {
            valores.push(mesAFecha(dto.mes));
            filtro = `mes = $${valores.length}::date`;
            orden = 'orden, id_meta';
        } else {
            valores.push(dto.desde, dto.hasta);
            filtro = `fecha_limite BETWEEN $${valores.length - 1}::date AND $${valores.length}::date`;
            orden = 'fecha_limite, orden, id_meta';
        }

        const filas = await this.persistencia.ejecutar(
            `SELECT ${COLUMNAS_META} FROM metas
             WHERE ${alcance} AND ${filtro}
             ORDER BY ${orden}`,
            valores,
        );
        return filas.map(materializarMeta);
    }
}