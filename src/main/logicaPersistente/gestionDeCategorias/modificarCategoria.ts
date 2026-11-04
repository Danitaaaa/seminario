import { IPersistenciaProyectos } from '../gestionDeProyectos/interfacesSincronizacion';
import { exigirAcceso, registrarCambioSiProyecto } from '../gestionDeProyectos/alcance';
import { Categoria } from './entidades';
import { COLUMNAS_CATEGORIA, materializarCategoria } from './materializador';
import { modificarCategoriaSchema, ModificarCategoriaDTO } from './dto';

export class ModificarCategoria {
  constructor(private readonly persistencia: IPersistenciaProyectos) {}

  async ejecutar(entrada: ModificarCategoriaDTO): Promise<Categoria> {
    const dto = modificarCategoriaSchema.parse(entrada);
    const [actual] = await this.persistencia.ejecutar(
      `SELECT id_proyecto, usuario_id FROM categorias WHERE id = $1`, [dto.id]);
    if (!actual) throw new Error('Categoría inexistente');
    await exigirAcceso(this.persistencia, actual.id_proyecto, actual.usuario_id, dto.usuarioId, 'categoria.editar');

    return this.persistencia.transaccion(async tx => {
      let filas;
      try {
        filas = await tx.ejecutar(
          `UPDATE categorias SET nombre = $1 WHERE id = $2 RETURNING ${COLUMNAS_CATEGORIA}`,
          [dto.nombre, dto.id]);
      } catch (e: any) {
        if (e?.code === '23505') throw new Error('Ya existe una categoría con ese nombre');
        throw e;
      }
      const c = materializarCategoria(filas[0]);
      await registrarCambioSiProyecto(tx, c.idProyecto, 'categoria', c.id, 'modificar', { datos: { nombre: c.nombre } });
      return c;
    });
  }
}