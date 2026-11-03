import { AlternarMetaDTOSchema, AlternarMetaDTO } from './dto';
import { Meta } from './entidades';
import { COLUMNAS_META, materializarMeta } from './materializador';
import { obtenerFilaMeta } from './buscarMeta';
import { IPersistenciaProyectos } from '../gestionDeProyectos/interfacesSincronizacion';
import { exigirAcceso, registrarCambioSiProyecto } from '../gestionDeProyectos/alcance';

// Marca o desmarca una meta. Guarda quién la completó y cuándo (insumo de las estadísticas).
export class AlternarMeta {
    constructor(private persistencia: IPersistenciaProyectos) {}

    async ejecutar(entrada: AlternarMetaDTO): Promise<Meta> {
        const dto = AlternarMetaDTOSchema.parse(entrada);
        const actual = await obtenerFilaMeta(this.persistencia, dto.idMeta);
        await exigirAcceso(this.persistencia, actual.id_proyecto, actual.id_usuario, dto.idUsuario,
        'meta.alternar');
        if (actual.trasladada_a) throw new Error('La meta fue trasladada a otro mes');

        const completada = dto.completada ?? !actual.completada;

        return this.persistencia.transaccion(async tx => {
            const filas = await tx.ejecutar(
                `UPDATE metas
                SET completada = $1::boolean,
                    fecha_completada = CASE WHEN $1::boolean THEN NOW() ELSE NULL END
                WHERE id_meta = $2
                RETURNING ${COLUMNAS_META}`,
                [completada, dto.idMeta],
            );
            const meta = materializarMeta(filas[0]);
            await registrarCambioSiProyecto(tx, meta.idProyecto, 'meta', meta.idMeta, 'modificar',
                { completada: meta.completada });
            return meta;
        });
    }
}