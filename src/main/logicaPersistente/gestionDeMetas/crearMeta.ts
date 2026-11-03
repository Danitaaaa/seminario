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
        await exigirAcceso(this.persistencia, idProyecto, dto.idUsuario, dto.idUsuario, 'meta.crear');

        return this.persistencia.transaccion(async tx => {
    // Meta personal => dueño es el usuario logueado. Meta de proyecto => sin dueño.
    const idDueno = idProyecto === null ? dto.idUsuario : null;

    const filas = await tx.ejecutar(
        `INSERT INTO metas (id_proyecto, id_usuario, titulo, descripcion, mes, orden, fecha_limite)
         VALUES ($1::int, $5::int, $2, $3, $4::date,
                 (SELECT COALESCE(MAX(m.orden), 0) + 1 FROM metas m
                   WHERE m.id_proyecto IS NOT DISTINCT FROM $1::int
                     AND m.id_usuario IS NOT DISTINCT FROM $5::int
                     AND m.mes = $4::date),
                 $6::date)
         RETURNING ${COLUMNAS_META}`,
        [idProyecto, dto.titulo, dto.descripcion ?? null, mesAFecha(dto.mes), idDueno, dto.fechaLimite ?? null],
    );
    const meta = materializarMeta(filas[0]);
    await registrarCambioSiProyecto(tx, meta.idProyecto, 'meta', meta.idMeta, 'crear',
        { titulo: meta.titulo, mes: meta.mes });
    return meta;
        });
    }
}