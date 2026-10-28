import { Persistencia } from '../../persistencia/Persistencia';
import { RepeticionMaterial } from './entidades';

export class ListarRepeticionesMaterial {
    constructor(private readonly persistencia: Persistencia) {}

    async ejecutar(usuarioId: number): Promise<RepeticionMaterial[]> {
        // La unión recupera el nombre del nodo sin exponer otros usuarios.
        const filas = await this.persistencia.ejecutar(
            `
            SELECT r.id_nodo, n.nombre, r.intervalo_dias, r.proxima_revision
            FROM repeticiones_material r
            INNER JOIN nodos n ON n.id_nodo = r.id_nodo
            WHERE r.id_usuario = $1
            ORDER BY r.proxima_revision, n.nombre
            `,
            [usuarioId]
        );

        return filas.map((fila) => ({
            nodoId: fila.id_nodo,
            nombre: fila.nombre,
            intervaloDias: fila.intervalo_dias,
            proximaRevision: fila.proxima_revision,
        }));
    }
}
