import { Persistencia } from '../../persistencia/persistencia';
import { CuadernoDTO } from './dto';

// Elimina un cuaderno con sus notas. La materia, sus carpetas, mazos y sesiones no se tocan.
export class EliminarCuaderno {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: CuadernoDTO): Promise<void> {
    const filas = await this.persistencia.ejecutar(
      `DELETE FROM cuaderno WHERE id_cuaderno = $1 AND id_usuario = $2 RETURNING id_cuaderno`,
      [datos.idCuaderno, datos.usuarioId]
    );
    if (filas.length === 0) throw new Error('El cuaderno no existe.');
  }
}
