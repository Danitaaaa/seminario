import { CrearMetaDTOSchema, CrearMetaDTO } from './dto';
import { Meta } from './entidades';
import { COLUMNAS_META, materializarMeta, mesAFecha } from './materializador';
import { IPersistenciaProyectos } from '../gestionDeProyectos/interfacesSincronizacion';
import { exigirAcceso, registrarCambioSiProyecto } from '../gestionDeProyectos/alcance';

export class CrearMeta {
    constructor(private persistencia: IPersistenciaProyectos) {}

    // Crea una meta personal (sin idProyecto) o de un proyecto.
    async ejecutar(entrada: CrearMetaDTO): Promise<Meta> {
        const dto = CrearMetaDTOSchema.parse(entrada);
        const idProyecto = dto.idProyecto ?? null;
        await exigirAcceso(this.persistencia, idProyecto, dto.idUsuario, dto.idUsuario, ['propietario', 'editor']);

        return this.persistencia.transaccion(async tx => {
            const filas = await tx.ejecutar(
                `INSERT INTO metas (id_proyecto, titulo, descripcion, mes, orden, creada_por, fecha_limite)
                 VALUES ($1::int, $2, $3, $4::date,
                         (SELECT COALESCE(MAX(m.orden), 0) + 1 FROM metas m
                           WHERE m.id_proyecto IS NOT DISTINCT FROM $1::int
                             AND m.mes = $4::date
                             AND ($1::int IS NOT NULL OR m.creada_por = $5::int)),
                         $5::int, $6::date)
                 RETURNING ${COLUMNAS_META}`,
                [idProyecto, dto.titulo, dto.descripcion ?? null, mesAFecha(dto.mes), dto.idUsuario, dto.fechaLimite ?? null],
            );
            const meta = materializarMeta(filas[0]);
            await registrarCambioSiProyecto(tx, meta.idProyecto, 'meta', meta.idMeta, 'crear',
                { titulo: meta.titulo, mes: meta.mes });
            return meta;
        });
    }
}