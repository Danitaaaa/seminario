import { ListarProyectosDTOSchema, ListarProyectosDTO } from './dto';
import { Proyecto } from './entidades';
import { IPersistenciaProyectos } from './interfacesSincronizacion';
import { materializarProyecto } from './materializador';

export class ListarProyectos {
    constructor(private persistencia: IPersistenciaProyectos) {}

    async ejecutar(entrada: ListarProyectosDTO): Promise<Proyecto[]> {
        const dto = ListarProyectosDTOSchema.parse(entrada);

        const params: unknown[] = [dto.idUsuario];
        const filtros = ['m.id_usuario = $1', 'm.fecha_baja IS NULL'];

        if (!dto.incluirFinalizados) filtros.push('(p.fecha_fin IS NULL OR p.fecha_fin > NOW())');
        if (dto.busqueda) {
            params.push(dto.busqueda);
            filtros.push(`similarity(p.nombre, $${params.length}) >= ${dto.umbral ?? 0.3}`);
        }

        const columnas = { nombre: 'p.nombre', fecha_creacion: 'p.fecha_creacion', fecha_fin: 'p.fecha_fin' } as const;
        const orden = `${columnas[dto.ordenarPor]} ${dto.direccion === 'DESC' ? 'DESC' : 'ASC'}`;

        const filas = await this.persistencia.ejecutar(
            `SELECT p.* FROM proyectos p
             JOIN proyecto_miembros m ON m.id_proyecto = p.id_proyecto
             WHERE ${filtros.join(' AND ')}
             ORDER BY ${orden}`,
            params,
        );
        return filas.map(materializarProyecto);
    }
}