import { ModificarNodoDTO } from "./dto";
import { materializarNodo } from "./materializador";
import { Persistencia } from "../../persistencia/persistencia";
import { Nodo } from "./entidades"

export class ModificarNodo {
    constructor(private readonly persistencia: Persistencia) {}

    // Modifica el nombre de un nodo
    async ejecutar(datos: ModificarNodoDTO): Promise<Nodo> {
        const nombre = datos.nombre?.trim();
        if (!nombre) {
            throw new Error("El nombre no puede estar vacío");
        }

        const filas = await this.persistencia.ejecutar(
            `UPDATE nodos
            SET nombre = $1, ultima_fecha_modificacion = NOW()
            WHERE id_nodo = $2 RETURNING *`,
            [nombre, datos.id]
        );

        if (filas.length === 0) {
            throw new Error("El nodo no existe");
        }
        return materializarNodo(filas[0]);
    }
}