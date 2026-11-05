import { z } from 'zod';
import type { IPersistenciaProyectos } from './interfacesSincronizacion';
import { proyectoDeNodo } from '../gestionMaterialEstudio/alcanceContenido';

const ClaveEdicionDTOSchema = z.object({
    entidad: z.enum(['archivo', 'evento', 'meta']),
    id: z.number().int().positive(),
});

export interface ClaveDeElemento {
    idProyecto: number;
    idGlobal: string;
}

/**
 * Proyecto e id global de un archivo, evento o meta, para pedir el bloqueo de edición al abrirlo.
 * null = es personal (no cuelga de un proyecto): no hay bloqueos.
 */
export class ClaveEdicion {
    constructor(private readonly persistencia: IPersistenciaProyectos) {}

    async ejecutar(entrada: unknown): Promise<ClaveDeElemento | null> {
        const { entidad, id } = ClaveEdicionDTOSchema.parse(entrada);
        if (entidad === 'archivo') {
            const [f] = await this.persistencia.ejecutar<{ id_global: string; id_padre: number }>(
                `SELECT id_global::text AS id_global, id_padre FROM archivos WHERE id_archivo = $1`, [id]);
            if (!f) throw new Error(`No existe un archivo con id ${id}.`);
            const idProyecto = await proyectoDeNodo(this.persistencia, f.id_padre);
            return idProyecto === null ? null : { idProyecto, idGlobal: f.id_global };
        }
        const [f] = await this.persistencia.ejecutar<{ id_global: string; id_proyecto: number | null }>(
            entidad === 'evento'
                ? `SELECT id_global::text AS id_global, id_proyecto FROM eventos WHERE id = $1`
                : `SELECT id_global::text AS id_global, id_proyecto FROM metas WHERE id_meta = $1`,
            [id]);
        if (!f) throw new Error(`No existe ${entidad === 'evento' ? 'el evento' : 'la meta'} con id ${id}.`);
        return f.id_proyecto === null ? null : { idProyecto: f.id_proyecto, idGlobal: f.id_global };
    }
}
