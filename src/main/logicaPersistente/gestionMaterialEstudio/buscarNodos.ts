import { BuscarNodosDTO } from "./dto";
import { materializarNodo } from "./materializador";
import { Persistencia } from "../../persistencia/Persistencia";
import { Nodo } from "./entidades";

const COLUMNAS: Record<BuscarNodosDTO['ordenarPor'] & string, string> = {
    nombre: 'nombre',
    fecha_carga: 'fecha_carga',
    fecha_ultimo_acceso: 'ultima_fecha_acceso',
    fecha_ultima_modificacion: 'ultima_fecha_modificacion',
    tamaño: 'tamaño',
};

export class BuscarNodos {
    constructor(private readonly persistencia: Persistencia) {}

    async ejecutar(criterios: BuscarNodosDTO): Promise<Nodo[]> {
        const columna = COLUMNAS[criterios.ordenarPor ?? 'nombre'];
        const direccion = criterios.direccion === 'DESC' ? 'DESC' : 'ASC';

        if (!criterios.busqueda) {
            const filas = await this.persistencia.ejecutar(
                `SELECT * FROM nodos
                 WHERE id_padre IS NOT DISTINCT FROM $1
                 ORDER BY ${columna} ${direccion}`,
                [criterios.idPadre]
            );
            return filas.map(materializarNodo);
        }

        const orden = columna === 'nombre' ? 'score DESC' : `${columna} ${direccion}`;

        const filas = await this.persistencia.ejecutar(
            `SELECT *, similarity(nombre, $1) AS score
             FROM nodos
             WHERE id_padre IS NOT DISTINCT FROM $2 AND similarity(nombre, $1) > $3
             ORDER BY ${orden}`,
            [criterios.busqueda, criterios.idPadre, criterios.umbral ?? 0.2]
        );
        return filas.map(materializarNodo);
    }
}