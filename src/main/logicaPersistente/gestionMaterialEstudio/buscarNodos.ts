import { BuscarNodosDTO } from "./dto";
import { materializarNodo } from "./materializador";
import { Persistencia } from "../../persistencia/Persistencia";
import { Nodo } from "./entidades"

export class BuscarNodos {
    constructor(private readonly persistencia: Persistencia) {}
    
    async ejecutar(criterios: BuscarNodosDTO): Promise<Nodo[]> {
        if (!criterios.busqueda) {
            const filas = await this.persistencia.ejecutar(
                `SELECT * FROM nodos WHERE id_padre = $1 ORDER BY nombre ASC`,
                [criterios.idPadre]
            );
            return filas.map(materializarNodo);
        }

        const filas = await this.persistencia.ejecutar(
            `SELECT *, similarity(nombre, $1) AS score
            FROM nodos
            WHERE id_padre = $2
            AND similarity(nombre, $1) > $3
            ORDER BY score DESC`,
            [criterios.busqueda, criterios.idPadre, criterios.umbral ?? 0.2]
        );
        return filas.map(materializarNodo);
    }
}