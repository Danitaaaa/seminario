import { Persistencia } from '../../persistencia/persistencia';
import { AsignarCuatrimestreDTO } from './dto';

// Pasa los horarios cargados antes de que existieran los cuatrimestres a uno elegido.
export class AsignarCuatrimestre {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: AsignarCuatrimestreDTO): Promise<{ asignados: number }> {
    const filas = await this.persistencia.ejecutar(
      `UPDATE horarios_cursado SET id_cuatrimestre = $2
        WHERE usuario_id = $1 AND id_cuatrimestre IS NULL
          AND EXISTS (SELECT 1 FROM cuatrimestre WHERE id_cuatrimestre = $2 AND id_usuario = $1)
       RETURNING id`,
      [datos.usuarioId, datos.idCuatrimestre]
    );
    return { asignados: filas.length };
  }
}
