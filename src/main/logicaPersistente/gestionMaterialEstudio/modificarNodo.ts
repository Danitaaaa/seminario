import { ModificarNodoDTO } from "./dto";
import { materializarNodo } from "./materializador";
import { Persistencia } from "../../persistencia/persistencia";
import { Nodo } from "./entidades"
import { registrarCambioContenido } from "../gestionDeProyectos/alcanceContenido";
import { exigirPermisoNodo } from "./alcanceContenido";

// Renombra un nodo existente y, si se indica, cambia su materia asociada
export class ModificarNodo {
    constructor(private readonly persistencia: Persistencia) {}

    // Modifica el nombre de un nodo
    async ejecutar(datos: ModificarNodoDTO): Promise<Nodo> {
        const nombre = datos.nombre?.trim();
        if (!nombre) {
            throw new Error("El nombre no puede estar vacío");
        }

        await exigirPermisoNodo(this.persistencia, datos.id, 'carpeta.renombrar');

        // Si no viene idMateria se deja la que tenía: la consulta solo la toca cuando $3 es true.
        const cambiaMateria = datos.idMateria !== undefined;
        const filas = await this.persistencia.ejecutar(
            `UPDATE nodos
            SET nombre = $1,
                id_materia = CASE WHEN $3 THEN $4::int ELSE id_materia END,
                ultima_fecha_modificacion = NOW()
            WHERE id_nodo = $2 RETURNING *`,
            [nombre, datos.id, cambiaMateria, datos.idMateria ?? null]
        );

        if (filas.length === 0) {
            throw new Error("El nodo no existe");
        }
        const f = filas[0];
        if (f.id_padre !== null) {
            await registrarCambioContenido(this.persistencia, 'nodo', f.id_nodo, 'modificar',
                f.id_global, f.id_padre, { nombre: f.nombre });
        }
        return materializarNodo(f);
    }
}