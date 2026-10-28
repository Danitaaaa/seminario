import { EliminarEventoDTO } from './dto';
import { buscarEvento } from './buscarEvento';
import { IPersistenciaProyectos } from '../gestionDeProyectos/interfacesSincronizacion';
import { exigirAcceso, registrarCambioSiProyecto } from '../gestionDeProyectos/alcance';

// Elimina el evento con el ID indicado
export class EliminarEvento {
  constructor(private readonly persistencia: IPersistenciaProyectos) {}

  async ejecutar(datos: EliminarEventoDTO): Promise<void> {
    const actual = await buscarEvento(this.persistencia, datos.id);
    await exigirAcceso(this.persistencia, actual.idProyecto, actual.usuarioId, datos.usuarioId, ['propietario', 'editor']);

    await this.persistencia.transaccion(async (tx) => {
      // El id_global se captura antes de que la fila desaparezca: el otro lado borra por él.
      const r = await tx.ejecutar(`DELETE FROM eventos WHERE id = $1 RETURNING id_global`, [datos.id]);
      await registrarCambioSiProyecto(tx, actual.idProyecto, 'evento', actual.id, 'eliminar',
        { titulo: actual.titulo, idGlobal: r[0]?.id_global });
    });
  }
}
