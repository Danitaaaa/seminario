import { Persistencia } from '../../persistencia/persistencia';
import { ResumenMaterial } from './entidades';
import { materializarResumenMaterial } from './materializador';

// Carpeta raíz de Material (la de los proyectos es otra y no se cuenta).
const ID_RAIZ_MATERIAL = 1;

// Cuántos archivos y carpetas hay en Material y cuánto pesan.
export class ResumenDeMaterial {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(): Promise<ResumenMaterial> {
    // Todas las carpetas que cuelgan de la raíz de Material, a cualquier profundidad.
    const filas = await this.persistencia.ejecutar(
      `WITH RECURSIVE arbol AS (
         SELECT id_nodo FROM nodos WHERE id_nodo = $1
         UNION ALL
         SELECT n.id_nodo FROM nodos n JOIN arbol a ON n.id_padre = a.id_nodo
       )
       SELECT (SELECT COUNT(*) FROM archivos ar WHERE ar.id_padre IN (SELECT id_nodo FROM arbol))::int AS archivos,
              (SELECT COALESCE(SUM(ar."tamaño"), 0) FROM archivos ar WHERE ar.id_padre IN (SELECT id_nodo FROM arbol)) AS bytes,
              (SELECT COUNT(*) - 1 FROM arbol)::int AS carpetas`,
      [ID_RAIZ_MATERIAL]
    );
    return materializarResumenMaterial(filas[0]);
  }
}
