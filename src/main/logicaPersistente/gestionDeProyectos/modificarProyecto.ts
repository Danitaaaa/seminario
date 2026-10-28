import { ModificarProyectoDTOSchema, ModificarProyectoDTO } from './dto';
import { Proyecto } from './entidades';
import { IPersistenciaProyectos } from './interfacesSincronizacion';
import { materializarProyecto } from './materializador';
import { exigirRol, registrarCambio } from './permisos';

interface IModificarNodo { ejecutar(dto: { id: number; nombre: string }): Promise<unknown>; }

export class ModificarProyecto {
    constructor(private persistencia: IPersistenciaProyectos, private modificarNodo: IModificarNodo) {}

    async ejecutar(entrada: ModificarProyectoDTO): Promise<Proyecto> {
        const dto = ModificarProyectoDTOSchema.parse(entrada);
        await exigirRol(this.persistencia, dto.idProyecto, dto.idUsuario, ['propietario', 'editor']);

        const sets: string[] = [];
        const params: unknown[] = [];
        const agregar = (col: string, valor: unknown) => { params.push(valor); sets.push(`${col} = $${params.length}`); };

        if (dto.nombre !== undefined) agregar('nombre', dto.nombre);
        if (dto.fechaFin !== undefined) agregar('fecha_fin', dto.fechaFin);
        if (sets.length === 0) throw new Error('No hay campos para modificar');

        params.push(dto.idProyecto);
        const proyecto = await this.persistencia.transaccion(async tx => {
            const filas = await tx.ejecutar(
                `UPDATE proyectos SET ${sets.join(', ')} WHERE id_proyecto = $${params.length} RETURNING *`, params);
            if (!filas[0]) throw new Error('Proyecto inexistente');
            const p = materializarProyecto(filas[0]);
            await registrarCambio(tx, p.idProyecto, 'proyecto', p.idProyecto, 'modificar', dto);
            return p;
        });

        // Mantener sincronizado el nombre de la carpeta raíz con el del proyecto
        if (dto.nombre !== undefined) await this.modificarNodo.ejecutar({ id: proyecto.idNodoRaiz, nombre: dto.nombre });
        return proyecto;
    }
}