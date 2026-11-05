import { Persistencia } from '../../persistencia/persistencia';
import { NotaDTO } from './dto';

// Elimina una nota del usuario.
export class EliminarNota {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: NotaDTO): Promise<void> {
    const filas = await this.persistencia.ejecutar(
      `DELETE FROM nota n USING cuaderno c
        WHERE n.id_nota = $1 AND c.id_cuaderno = n.id_cuaderno AND c.id_usuario = $2
       RETURNING n.id_nota`,
      [datos.idNota, datos.usuarioId]
    );
    if (filas.length === 0) throw new Error('La nota no existe.');
  }
}
