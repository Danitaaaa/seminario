import { ModificarNodoDTO } from "./dto";
import { materializarNodo } from "./materializador";
import { Persistencia } from "../../persistencia/Persistencia";
import { Nodo } from "./entidades"

export class ModificarNodo {
    constructor(private readonly persistencia: Persistencia) {}

    // Modifica el nombre de un nodo
    async ejecutar(datos: ModificarNodoDTO): Promise<Nodo> {
        const filas = await this.persistencia.ejecutar(
            `UPDATE nodos 
            SET nombre = $1
            WHERE id_nodo = $2 RETURNING *`,
            [datos.nombre, datos.id]
        );
        return materializarNodo(filas[0]);
    }
}