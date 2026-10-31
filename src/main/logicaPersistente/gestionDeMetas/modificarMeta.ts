import { ModificarMetaDTOSchema, ModificarMetaDTO } from './dto';
import { Meta } from './entidades';
import { COLUMNAS_META, materializarMeta } from './materializador';
import { obtenerFilaMeta } from './buscarMeta';
import { IPersistenciaProyectos } from '../gestionDeProyectos/interfacesSincronizacion';
import { exigirAcceso, registrarCambioSiProyecto } from '../gestionDeProyectos/alcance';

// Edita título, descripción, orden o fecha límite de una meta
export class ModificarMeta {
    constructor(private persistencia: IPersistenciaProyectos) {}

    async ejecutar(entrada: ModificarMetaDTO): Promise<Meta> {
        const dto = ModificarMetaDTOSchema.parse(entrada);
        const actual = await obtenerFilaMeta(this.persistencia, dto.idMeta);
        await exigirAcceso(this.persistencia, actual.id_proyecto, actual.id_usuario, dto.idUsuario, 'meta.editar');

        const sets: string[] = [];
        const valores: unknown[] = [];
        const agregar = (columna: string, valor: unknown) => {
            valores.push(valor);
            sets.push(`${columna} = $${valores.length}`);
        };
        if (dto.titulo !== undefined) agregar('titulo', dto.titulo);
        if (dto.descripcion !== undefined) agregar('descripcion', dto.descripcion);
        if (dto.orden !== undefined) agregar('orden', dto.orden);
        if (dto.fechaLimite !== undefined) agregar('fecha_limite', dto.fechaLimite);
        if (sets.length === 0) return materializarMeta(actual);

        valores.push(dto.idMeta);
        return this.persistencia.transaccion(async tx => {
            const filas = await tx.ejecutar(
                `UPDATE metas SET ${sets.join(', ')} WHERE id_meta = $${valores.length}
                 RETURNING ${COLUMNAS_META}`,
                valores,
            );
            const meta = materializarMeta(filas[0]);
            await registrarCambioSiProyecto(tx, meta.idProyecto, 'meta', meta.idMeta, 'modificar',
                { titulo: meta.titulo, orden: meta.orden, fechaLimite: meta.fechaLimite });
            return meta;
        });
    }
}