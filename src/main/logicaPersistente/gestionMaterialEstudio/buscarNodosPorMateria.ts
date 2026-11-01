import { Persistencia } from '../../persistencia/persistencia';
import { Nodo } from './entidades';
import { materializarNodo } from './materializador';

// Busca las carpetas asociadas a una materia dentro de una carpeta y todas sus subcarpetas.
export class BuscarNodosPorMateria {
    constructor(private readonly persistencia: Persistencia) {}

    async ejecutar(idRaiz: number, idMateria: number): Promise<Nodo[]> {
        // "arbol" junta la carpeta raíz y todas sus descendientes; después se filtra por materia.
        const filas = await this.persistencia.ejecutar(
            `WITH RECURSIVE arbol AS (
                 SELECT id_nodo FROM nodos WHERE id_nodo = $1
                 UNION ALL
                 SELECT n.id_nodo FROM nodos n
                 INNER JOIN arbol a ON n.id_padre = a.id_nodo
             )
             SELECT * FROM nodos
             WHERE id_nodo IN (SELECT id_nodo FROM arbol)
               AND id_nodo <> $1
               AND id_materia = $2
             ORDER BY nombre`,
            [idRaiz, idMateria]
        );
        return filas.map(materializarNodo);
    }
}
