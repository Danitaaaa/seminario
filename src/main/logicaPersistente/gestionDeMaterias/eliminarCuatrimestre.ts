import { Persistencia } from '../../persistencia/persistencia';
import { CuatrimestreDTO } from './dto';

// Borra un cuatrimestre con sus horarios y recesos. Los cuadernos no se borran: quedan sin cuatrimestre.
export class EliminarCuatrimestre {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: CuatrimestreDTO): Promise<void> {
    const filas = await this.persistencia.ejecutar(
      `DELETE FROM cuatrimestre WHERE id_cuatrimestre = $1 AND id_usuario = $2 RETURNING id_cuatrimestre`,
      [datos.idCuatrimestre, datos.usuarioId]
    );
    if (filas.length === 0) throw new Error('El cuatrimestre no existe.');
  }
}
