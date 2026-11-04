import { IPersistenciaProyectos } from '../gestionDeProyectos/interfacesSincronizacion';
import { exigirAcceso, registrarCambioSiProyecto } from '../gestionDeProyectos/alcance';
import { eliminarCategoriaSchema, EliminarCategoriaDTO } from './dto';

export class EliminarCategoria {
  constructor(private readonly persistencia: IPersistenciaProyectos) {}

  async ejecutar(entrada: EliminarCategoriaDTO): Promise<void> {
    const dto = eliminarCategoriaSchema.parse(entrada);
    const [actual] = await this.persistencia.ejecutar(
      `SELECT id_proyecto, usuario_id FROM categorias WHERE id = $1`, [dto.id]);
    if (!actual) return;
    await exigirAcceso(this.persistencia, actual.id_proyecto, actual.usuario_id, dto.usuarioId, 'categoria.eliminar');

    await this.persistencia.transaccion(async tx => {
      const [borrada] = await tx.ejecutar(
        `DELETE FROM categorias WHERE id = $1 RETURNING id_global`, [dto.id]);
      // En 'eliminar' la fila ya no existe: el idGlobal viaja en datos.
      if (borrada) {
        await registrarCambioSiProyecto(tx, actual.id_proyecto, 'categoria', dto.id, 'eliminar',
          { idGlobal: borrada.id_global });
      }
    });
  }
}