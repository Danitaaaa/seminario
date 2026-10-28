import { CopiarMetasDTOSchema, CopiarMetasDTO } from './dto';
import { Meta } from './entidades';
import { COLUMNAS_META, materializarMeta, mesAFecha } from './materializador';
import { IPersistenciaProyectos } from '../gestionDeProyectos/interfacesSincronizacion';
import { exigirAcceso, registrarCambioSiProyecto } from '../gestionDeProyectos/alcance';

// Reutiliza metas de un mes en otro (por defecto solo las pendientes).
// Con idProyecto copia las del proyecto; sin idProyecto, las metas personales del usuario.
// Las que ya existen en el mes destino con el mismo título se omiten, así no se duplican.
export class CopiarMetas {
    constructor(private persistencia: IPersistenciaProyectos) {}

    async ejecutar(entrada: CopiarMetasDTO): Promise<Meta[]> {
        const dto = CopiarMetasDTOSchema.parse(entrada);
        if (dto.mesOrigen === dto.mesDestino) throw new Error('El mes de origen y el de destino son el mismo');
        const idProyecto = dto.idProyecto ?? null;
        await exigirAcceso(this.persistencia, idProyecto, dto.idUsuario, dto.idUsuario, ['propietario', 'editor']);

        return this.persistencia.transaccion(async tx => {
            const filas = await tx.ejecutar(
                `INSERT INTO metas (id_proyecto, titulo, descripcion, mes, orden, creada_por, id_meta_origen)
                SELECT o.id_proyecto, o.titulo, o.descripcion, $3::date,
                        (SELECT COALESCE(MAX(d.orden), 0) FROM metas d
                          WHERE d.id_proyecto IS NOT DISTINCT FROM $1::int
                            AND d.mes = $3::date
                            AND ($1::int IS NOT NULL OR d.creada_por = $5::int))
                        + ROW_NUMBER() OVER (ORDER BY o.orden, o.id_meta),
                        $5::int, o.id_meta
                FROM metas o
                WHERE o.id_proyecto IS NOT DISTINCT FROM $1::int
                AND o.mes = $2::date
                AND ($1::int IS NOT NULL OR o.creada_por = $5::int)
                AND ($4::boolean = FALSE OR o.completada = FALSE)
                AND NOT EXISTS (SELECT 1 FROM metas d WHERE d.id_meta_origen = o.id_meta)
                AND NOT EXISTS (SELECT 1 FROM metas d
                                    WHERE d.id_proyecto IS NOT DISTINCT FROM $1::int
                                      AND d.mes = $3::date AND d.titulo = o.titulo
                                      AND ($1::int IS NOT NULL OR d.creada_por = $5::int))
                RETURNING ${COLUMNAS_META}`,
                [idProyecto, mesAFecha(dto.mesOrigen), mesAFecha(dto.mesDestino), dto.soloPendientes, dto.idUsuario],
            );
            const copiadas = filas.map(materializarMeta);
            for (const m of copiadas) {
                await registrarCambioSiProyecto(tx, m.idProyecto, 'meta', m.idMeta, 'crear',
                    { titulo: m.titulo, mes: m.mes });
            }
            return copiadas;
        });
    }
}