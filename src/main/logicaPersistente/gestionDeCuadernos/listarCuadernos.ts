import { Persistencia } from '../../persistencia/persistencia';
import { ResumenCuaderno } from './entidades';
import { materializarResumen } from './materializador';
import { UsuarioDTO } from './dto';
import { mazosDelCuaderno } from './mazosDelCuaderno';

// Los cuadernos del usuario con lo que tiene su materia: archivos de las carpetas de esa materia
// (con sus subcarpetas), flashcards de sus mazos y las notas del cuaderno.
export class ListarCuadernos {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: UsuarioDTO, idCuaderno?: number): Promise<ResumenCuaderno[]> {
    const filas = await this.persistencia.ejecutar(
      `WITH RECURSIVE mis AS (
         SELECT c.id_cuaderno, c.nombre AS cuaderno, m.id_materia, m.nombre, m.anio, m.cuatrimestre, m.estado,
                f.nombre AS formacion
           FROM cuaderno c
           JOIN materia m ON m.id_materia = c.id_materia
           JOIN formacion f ON f.id_formacion = m.id_formacion
          WHERE c.id_usuario = $1 AND f.id_usuario = $1 AND ($2::int IS NULL OR c.id_cuaderno = $2)
       ),
       arbol AS (
         SELECT n.id_nodo, n.id_materia FROM nodos n WHERE n.id_materia IN (SELECT id_materia FROM mis)
         UNION
         SELECT h.id_nodo, a.id_materia FROM nodos h JOIN arbol a ON h.id_padre = a.id_nodo
       )
       SELECT mis.*,
              (SELECT count(DISTINCT ar.id_archivo) FROM archivos ar JOIN arbol a ON ar.id_padre = a.id_nodo
                WHERE a.id_materia = mis.id_materia)::int AS archivos,
              (SELECT count(*) FROM flashcards fl
                WHERE fl.id_deck IN (${mazosDelCuaderno('$1', 'mis.nombre', 'mis.id_materia', 'mis.id_cuaderno')}))::int AS flashcards,
              (SELECT count(*) FROM nota n WHERE n.id_cuaderno = mis.id_cuaderno)::int AS notas_total,
              (SELECT count(*) FROM nota n WHERE n.id_cuaderno = mis.id_cuaderno AND n.estado <> 'pendiente')::int AS notas_cargadas,
              prox.nombre AS proximo_nombre,
              to_char(prox.fecha, 'YYYY-MM-DD') AS proximo_fecha
         FROM mis
         LEFT JOIN LATERAL (
           SELECT n.nombre, n.fecha FROM nota n
            WHERE n.id_cuaderno = mis.id_cuaderno AND n.estado = 'pendiente' AND n.fecha >= CURRENT_DATE
            ORDER BY n.fecha LIMIT 1
         ) prox ON true
        ORDER BY mis.anio NULLS LAST, mis.cuaderno`,
      [datos.usuarioId, idCuaderno ?? null]
    );
    return filas.map(materializarResumen);
  }
}
