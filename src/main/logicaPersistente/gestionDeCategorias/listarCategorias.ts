import { IPersistenciaProyectos } from '../gestionDeProyectos/interfacesSincronizacion';
import { exigirPermiso } from '../gestionDeProyectos/permisos';
import { Categoria } from './entidades';
import { COLUMNAS_CATEGORIA, materializarCategoria } from './materializador';
import { listarCategoriasSchema, ListarCategoriasDTO } from './dto';

export class ListarCategorias {
  constructor(private readonly persistencia: IPersistenciaProyectos) {}

  async ejecutar(entrada: ListarCategoriasDTO): Promise<Categoria[]> {
    const dto = listarCategoriasSchema.parse(entrada);

    // Al abrir un proyecto: solo las de ese proyecto (cualquier miembro puede verlas).
    if (dto.idProyecto != null) {
      await exigirPermiso(this.persistencia, dto.idProyecto, dto.usuarioId, 'categoria.listar');
      const filas = await this.persistencia.ejecutar(
        `SELECT ${COLUMNAS_CATEGORIA} FROM categorias WHERE id_proyecto = $1 ORDER BY nombre ASC`,
        [dto.idProyecto]);
      return filas.map(materializarCategoria);
    }

    // Vista personal: las propias (idProyecto null) y las de mis proyectos activos, cada una con su
    // proyecto para poder filtrar desde el front.
    const filas = await this.persistencia.ejecutar(
      `SELECT c.id, c.id_global, c.usuario_id, c.id_proyecto, c.nombre, p.nombre AS nombre_proyecto
       FROM categorias c
       LEFT JOIN proyectos p ON p.id_proyecto = c.id_proyecto
       WHERE c.usuario_id = $1
          OR c.id_proyecto IN (SELECT id_proyecto FROM proyecto_miembros
                               WHERE id_usuario = $1 AND fecha_baja IS NULL)
       ORDER BY (c.id_proyecto IS NOT NULL), p.nombre, c.nombre`,
      [dto.usuarioId]);
    return filas.map(materializarCategoria);
  }
}