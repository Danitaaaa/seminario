import { ListarMetasDTOSchema, ListarMetasDTO } from './dto';
import { Meta } from './entidades';
import { COLUMNAS_META, materializarMeta, mesAFecha } from './materializador';
import { IPersistenciaProyectos } from '../gestionDeProyectos/interfacesSincronizacion';
import { exigirAcceso, filtroAlcance } from '../gestionDeProyectos/alcance';

// Lista las metas de un mes, en el orden definido por el usuario.
// Con idProyecto: las del proyecto. Sin idProyecto: las metas personales del usuario.
export class ListarMetas {
    constructor(private persistencia: IPersistenciaProyectos) {}

    async ejecutar(entrada: ListarMetasDTO): Promise<Meta[]> {
        const dto = ListarMetasDTOSchema.parse(entrada);
        const idProyecto = dto.idProyecto ?? null;
        await exigirAcceso(this.persistencia, idProyecto, dto.idUsuario, dto.idUsuario,
            ['propietario', 'editor', 'lector']);

        const valores: unknown[] = [];
        const alcance = filtroAlcance(valores, idProyecto, dto.idUsuario);
        valores.push(mesAFecha(dto.mes));

        const filas = await this.persistencia.ejecutar(
            `SELECT ${COLUMNAS_META} FROM metas
             WHERE ${alcance} AND mes = $${valores.length}::date
             ORDER BY orden, id_meta`,
            valores,
        );
        return filas.map(materializarMeta);
    }
}