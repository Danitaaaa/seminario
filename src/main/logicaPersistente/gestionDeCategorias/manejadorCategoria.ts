import type { ManejadorEntidad } from '../gestionDeProyectos/edicionCompartida';
import type { CambioPendiente } from '../gestionDeProyectos/entidades';
import type { IPersistenciaProyectos } from '../gestionDeProyectos/interfacesSincronizacion';

type Payload = { idGlobal?: string; datos?: { nombre?: string } };

// Categorías de proyecto: viajan por la cola (como los nodos), no por bloqueo/versión.
export class ManejadorCategoria implements ManejadorEntidad {
  constructor(private p: IPersistenciaProyectos, _usuarioSesion?: () => number | null) {}

  async leer(idProyecto: number, idGlobal: string) {
    const f = await this.p.ejecutar(
      `SELECT nombre FROM categorias WHERE id_global = $1 AND id_proyecto = $2`, [idGlobal, idProyecto]);
    return f[0] ? { datos: { nombre: f[0].nombre } } : null;
  }

  async aplicarCambio(idProyecto: number, cambio: CambioPendiente): Promise<void> {
    const { idGlobal, datos } = (cambio.payload ?? {}) as Payload;
    if (!idGlobal) return;

    if (cambio.operacion === 'eliminar') {
      await this.p.ejecutar(`DELETE FROM categorias WHERE id_global = $1 AND id_proyecto = $2`, [idGlobal, idProyecto]);
      return;
    }
    const nombre = datos?.nombre;
    if (!nombre) return;

    // Ya la tengo: renombrar (si el nombre lo usa otra categoría local, se deja como está).
    const existente = await this.p.ejecutar(
      `UPDATE categorias SET nombre = $3
       WHERE id_global = $1 AND id_proyecto = $2
         AND NOT EXISTS (SELECT 1 FROM categorias o
                         WHERE o.id_proyecto = $2 AND o.nombre = $3 AND o.id_global <> $1)
       RETURNING id`, [idGlobal, idProyecto, nombre]);
    if (existente.length > 0) return;
    const [ya] = await this.p.ejecutar(`SELECT 1 AS x FROM categorias WHERE id_global = $1`, [idGlobal]);
    if (ya) return;

    // Misma categoría creada en dos PCs sin conexión: se adopta el id_global remoto, sin duplicar.
    const adoptada = await this.p.ejecutar(
      `UPDATE categorias SET id_global = $1 WHERE id_proyecto = $2 AND nombre = $3 RETURNING id`,
      [idGlobal, idProyecto, nombre]);
    if (adoptada.length > 0) return;

    await this.p.ejecutar(
      `INSERT INTO categorias (id_global, id_proyecto, nombre) VALUES ($1, $2, $3)
       ON CONFLICT (id_global) DO NOTHING`, [idGlobal, idProyecto, nombre]);
  }
}