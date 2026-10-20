import { ListarMiembrosDTOSchema, ListarMiembrosDTO } from './dto';
import { ProyectoMiembro } from './entidades';
import { IPersistenciaProyectos } from './interfacesSincronizacion';
import { materializarMiembro } from './materializador';
import { exigirRol } from './permisos';

export class ListarMiembros {
    constructor(private persistencia: IPersistenciaProyectos) {}

    async ejecutar(entrada: ListarMiembrosDTO): Promise<ProyectoMiembro[]> {
        const dto = ListarMiembrosDTOSchema.parse(entrada);
        await exigirRol(this.persistencia, dto.idProyecto, dto.idUsuarioSolicitante, ['propietario', 'editor', 'lector']);

        const filas = await this.persistencia.ejecutar(
            `SELECT * FROM proyecto_miembros
             WHERE id_proyecto = $1 ${dto.soloActivos ? 'AND fecha_baja IS NULL' : ''}
             ORDER BY fecha_union`,
            [dto.idProyecto],
        );
        return filas.map(materializarMiembro);
    }
}