import { RepartirTareasDTOSchema, RepartirTareasDTO } from './dto';
import { Tarea } from './entidades';
import { COLUMNAS_TAREA, materializarTarea } from './materializador';
import { consultar, siguienteOrden } from './buscarTarea';
import { IPersistenciaProyectos } from '../gestionDeProyectos/interfacesSincronizacion';
import { exigirRol } from '../gestionDeProyectos/permisos';
import { registrarCambioSiProyecto } from '../gestionDeProyectos/alcance';

export class RepartirTareas {
    constructor(private persistencia: IPersistenciaProyectos) {}

    // Asigna cada tarea pendiente sin asignar al integrante con menos tareas pendientes en ese momento.
    // Las que vencen antes se reparten primero. Devuelve solo las tareas que cambiaron.
    // Solo aplica a proyectos (las tareas personales no se asignan).
    async ejecutar(entrada: RepartirTareasDTO): Promise<Tarea[]> {
        const dto = RepartirTareasDTOSchema.parse(entrada);
        await exigirRol(this.persistencia, dto.idProyecto, dto.idUsuario, ['propietario', 'editor']);

        return this.persistencia.transaccion(async tx => {
            const miembros = await consultar(
                tx,
                `SELECT id_usuario FROM proyecto_miembros
                 WHERE id_proyecto = $1 AND fecha_baja IS NULL AND rol IN ('propietario', 'editor')
                 ORDER BY fecha_union, id_proyecto_miembro`,
                [dto.idProyecto],
            );
            if (miembros.length === 0) return [];

            const carga = new Map<number, number>();
            for (const m of miembros) carga.set(m.id_usuario, 0);

            const cargas = await consultar(
                tx,
                `SELECT id_asignado, COUNT(*)::int AS n FROM tareas
                 WHERE id_proyecto = $1 AND NOT completada AND id_asignado IS NOT NULL
                 GROUP BY id_asignado`,
                [dto.idProyecto],
            );
            for (const c of cargas) {
                if (carga.has(c.id_asignado)) carga.set(c.id_asignado, c.n);
            }

            const pendientes = await consultar(
                tx,
                `SELECT id_tarea FROM tareas
                 WHERE id_proyecto = $1 AND NOT completada AND id_asignado IS NULL
                 ORDER BY fecha_limite NULLS LAST, orden, id_tarea`,
                [dto.idProyecto],
            );

            const ids = [...carga.keys()];
            const cargaDe = (id: number) => carga.get(id) ?? 0;
            const repartidas: Tarea[] = [];

            for (const pendiente of pendientes) {
                let elegido = ids[0];
                for (const id of ids) {
                    if (cargaDe(id) < cargaDe(elegido)) elegido = id;
                }

                const orden = await siguienteOrden(tx, dto.idProyecto, elegido);
                const filas = await consultar(
                    tx,
                    `UPDATE tareas SET id_asignado = $2, orden = $3
                     WHERE id_tarea = $1
                     RETURNING ${COLUMNAS_TAREA}`,
                    [pendiente.id_tarea, elegido, orden],
                );
                const tarea = materializarTarea(filas[0]);
                carga.set(elegido, cargaDe(elegido) + 1);
                // Antes llamaba a registrarCambio directo: sin idGlobal en el payload, el cambio no se subía por ningún camino.
                await registrarCambioSiProyecto(tx, dto.idProyecto, 'tarea', tarea.idTarea, 'modificar',
                    { idAsignado: tarea.idAsignado });
                repartidas.push(tarea);
            }
            return repartidas;
        });
    }
}
