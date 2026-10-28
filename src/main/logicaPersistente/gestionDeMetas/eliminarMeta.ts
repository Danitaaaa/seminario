import { EliminarMetaDTOSchema, EliminarMetaDTO } from './dto';
import { obtenerFilaMeta } from './buscarMeta';
import { IPersistenciaProyectos } from '../gestionDeProyectos/interfacesSincronizacion';
import { exigirAcceso, registrarCambioSiProyecto } from '../gestionDeProyectos/alcance';

// En un proyecto solo el propietario puede borrar metas (editores crean y marcan).
// Una meta personal la puede borrar su creador.
export class EliminarMeta {
    constructor(private persistencia: IPersistenciaProyectos) {}

    async ejecutar(entrada: EliminarMetaDTO): Promise<void> {
        const dto = EliminarMetaDTOSchema.parse(entrada);
        const actual = await obtenerFilaMeta(this.persistencia, dto.idMeta);
        await exigirAcceso(this.persistencia, actual.id_proyecto, actual.creada_por, dto.idUsuario, ['propietario']);

        await this.persistencia.transaccion(async tx => {
            const r = await tx.ejecutar(`DELETE FROM metas WHERE id_meta = $1 RETURNING id_global`, [dto.idMeta]);
            await registrarCambioSiProyecto(tx, actual.id_proyecto, 'meta', dto.idMeta, 'eliminar',
                { titulo: actual.titulo, idGlobal: r[0]?.id_global });
        });
    }
}
