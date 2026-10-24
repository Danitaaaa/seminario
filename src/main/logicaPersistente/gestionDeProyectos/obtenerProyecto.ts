import { ObtenerProyectoDTOSchema, ObtenerProyectoDTO } from './dto';
import { Proyecto } from './entidades';
import { IPersistenciaProyectos } from './interfacesSincronizacion';
import { materializarProyecto } from './materializador';
import { exigirRol } from './permisos';

export class ObtenerProyecto {
    constructor(private persistencia: IPersistenciaProyectos) {}

    async ejecutar(entrada: ObtenerProyectoDTO): Promise<Proyecto> {
        const dto = ObtenerProyectoDTOSchema.parse(entrada);
        await exigirRol(this.persistencia, dto.idProyecto, dto.idUsuario, ['propietario', 'editor', 'lector']);

        const filas = await this.persistencia.ejecutar(`SELECT * FROM proyectos WHERE id_proyecto = $1`, [dto.idProyecto]);
        if (!filas[0]) throw new Error('Proyecto inexistente');
        return materializarProyecto(filas[0]);
    }
}