import { MoverNodoDTO } from "./dto";
import { materializarNodo } from "./materializador";
import { Persistencia } from "../../persistencia/Persistencia";
import { Nodo } from "./entidades"

export class MoverNodo {
    constructor(private readonly persistencia: Persistencia) {}

    // Cambia el nodoPadre de un nodo
    async ejecutar(datos: MoverNodoDTO): Promise<Nodo> {
        const filas = await this.persistencia.ejecutar(
            `UPDATE nodos
            SET id_padre = $1
            WHERE id_nodo = $2 RETURNING *`,
            [datos.idNuevoPadre, datos.id]
        );
        return materializarNodo(filas[0]);
    }
}