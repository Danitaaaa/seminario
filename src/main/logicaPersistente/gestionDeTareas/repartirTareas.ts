import { RepartirTareasDTOSchema, RepartirTareasDTO } from './dto';
import { Tarea } from './entidades';
import { COLUMNAS_TAREA, materializarTarea } from './materializador';
import { Columna, consultar, siguienteOrden } from './buscarTarea';
import { IPersistenciaProyectos } from '../gestionDeProyectos/interfacesSincronizacion';
import { exigirPermiso } from '../gestionDeProyectos/permisos';
import { registrarCambioSiProyecto } from '../gestionDeProyectos/alcance';

const clave = (c: Columna): string => (c.global ?? `u:${c.local}`);

export class RepartirTareas {
    constructor(private persistencia: IPersistenciaProyectos) {}

    // Asigna cada tarea pendiente sin asignar al integrante con menos tareas pendientes en ese momento.
    // Las que vencen antes se reparten primero. Devuelve solo las tareas que cambiaron.
    // Solo aplica a proyectos (las tareas personales no se asignan).
    async ejecutar(entrada: RepartirTareasDTO): Promise<Tarea[]> {
        const dto = RepartirTareasDTOSchema.parse(entrada);
        await exigirPermiso(this.persistencia, dto.idProyecto, dto.idUsuario, 'tarea.repartir');

        return this.persistencia.transaccion(async tx => {
            const miembros = await consultar(
                tx,
                `SELECT id_usuario, id_global_usuario FROM proyecto_miembros
                 WHERE id_proyecto = $1 AND fecha_baja IS NULL AND rol IN ('propietario', 'editor')
                 ORDER BY fecha_union, id_proyecto_miembro`,
                [dto.idProyecto],
            );
            if (miembros.length === 0) return [];

            // Columna de cada integrante: uid global si lo tiene, id local si no.
            const columnas = new Map<string, Columna>();
            const carga = new Map<string, number>();
            for (const m of miembros) {
                const col: Columna = m.id_global_usuario
                    ? { local: null, global: m.id_global_usuario }
                    : { local: m.id_usuario, global: null };
                columnas.set(clave(col), col);
                carga.set(clave(col), 0);
            }

            const cargas = await consultar(
                tx,
                `SELECT id_asignado, id_asignado_global, COUNT(*)::int AS n FROM tareas
                 WHERE id_proyecto = $1 AND NOT completada
                   AND (id_asignado IS NOT NULL OR id_asignado_global IS NOT NULL)
                 GROUP BY id_asignado, id_asignado_global`,
                [dto.idProyecto],
            );
            for (const c of cargas) {
                const k = clave({ local: c.id_asignado, global: c.id_asignado_global });
                if (carga.has(k)) carga.set(k, c.n);
            }

            const pendientes = await consultar(
                tx,
                `SELECT id_tarea FROM tareas
                 WHERE id_proyecto = $1 AND NOT completada
                   AND id_asignado IS NULL AND id_asignado_global IS NULL
                 ORDER BY fecha_limite NULLS LAST, orden, id_tarea`,
                [dto.idProyecto],
            );

            const claves = [...carga.keys()];
            const cargaDe = (k: string) => carga.get(k) ?? 0;
            const repartidas: Tarea[] = [];

            for (const pendiente of pendientes) {
                let elegido = claves[0];
                for (const k of claves) {
                    if (cargaDe(k) < cargaDe(elegido)) elegido = k;
                }
                const col = columnas.get(elegido)!;

                const orden = await siguienteOrden(tx, dto.idProyecto, col);
                const filas = await consultar(
                    tx,
                    `UPDATE tareas SET id_asignado = $2, id_asignado_global = $3, orden = $4
                     WHERE id_tarea = $1
                     RETURNING ${COLUMNAS_TAREA}`,
                    [pendiente.id_tarea, col.local, col.global, orden],
                );
                const tarea = materializarTarea(filas[0]);
                carga.set(elegido, cargaDe(elegido) + 1);
                await registrarCambioSiProyecto(tx, dto.idProyecto, 'tarea', tarea.idTarea, 'modificar',
                    { idAsignadoGlobal: tarea.idAsignadoGlobal });
                repartidas.push(tarea);
            }
            return repartidas;
        });
    }
}