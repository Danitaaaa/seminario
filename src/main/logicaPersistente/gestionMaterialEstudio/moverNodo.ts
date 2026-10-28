import { MoverNodoDTO } from "./dto";
import { materializarNodo } from "./materializador";
import { Persistencia } from "../../persistencia/persistencia";
import { Nodo } from "./entidades"
import { registrarCambioContenido } from "../gestionDeProyectos/alcanceContenido";

// Cambia el nodoPadre de uno o más nodos
export class MoverNodo {
    constructor(private readonly persistencia: Persistencia) {}

    async ejecutar(datos: MoverNodoDTO): Promise<Nodo> {
        const { id, idNuevoPadre } = datos;

        // La raíz es única: ningún nodo puede quedar sin padre
        if (idNuevoPadre === null || idNuevoPadre === undefined) {
            throw new Error("El nodo destino es obligatorio");
        }

        // Mover un nodo dentro de sí mismo
        if (id === idNuevoPadre) {
            throw new Error("No se puede mover un nodo dentro de sí mismo");
        }

        // El nodo a mover debe existir y no puede ser la raíz
        const nodos = await this.persistencia.ejecutar(
            `SELECT id_padre FROM nodos WHERE id_nodo = $1`,
            [id]
        );
        if (nodos.length === 0) {
            throw new Error("El nodo a mover no existe");
        }
        if (nodos[0].id_padre === null) {
            throw new Error("No se puede mover la carpeta raíz");
        }

        // El destino debe existir
        const destino = await this.persistencia.ejecutar(
            `SELECT 1 FROM nodos WHERE id_nodo = $1`,
            [idNuevoPadre]
        );
        if (destino.length === 0) {
            throw new Error("El nodo destino no existe");
        }

        // El destino no puede ser descendiente del nodo a mover
        const descendientes = await this.persistencia.ejecutar(
            `WITH RECURSIVE descendientes AS (
                SELECT id_nodo FROM nodos WHERE id_padre = $1
                UNION ALL
                SELECT n.id_nodo
                FROM nodos n
                JOIN descendientes d ON n.id_padre = d.id_nodo
            )
            SELECT 1 FROM descendientes WHERE id_nodo = $2`,
            [id, idNuevoPadre]
        );
        if (descendientes.length > 0) {
            throw new Error("No se puede mover un nodo dentro de uno de sus descendientes");
        }

        const filas = await this.persistencia.ejecutar(
            `UPDATE nodos
            SET id_padre = $1
            WHERE id_nodo = $2 RETURNING *`,
            [idNuevoPadre, id]
        );
        const f = filas[0];
        // Se encola contra el proyecto de DESTINO (si el destino es personal, no se encola nada).
        await registrarCambioContenido(this.persistencia, 'nodo', f.id_nodo, 'mover',
            f.id_global, f.id_padre, { nombre: f.nombre });
        return materializarNodo(f);
    }
}
