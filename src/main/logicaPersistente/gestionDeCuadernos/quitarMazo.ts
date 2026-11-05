import { Persistencia } from '../../persistencia/persistencia';
import { MazoCuadernoDTO } from './dto';

// Saca del cuaderno un mazo agregado a mano. El mazo no se borra.
export class QuitarMazo {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: MazoCuadernoDTO): Promise<void> {
    await this.persistencia.ejecutar(
      `DELETE FROM cuaderno_mazo cm USING cuaderno c
        WHERE cm.id_cuaderno = $1 AND cm.id_deck = $3 AND c.id_cuaderno = cm.id_cuaderno AND c.id_usuario = $2`,
      [datos.idCuaderno, datos.usuarioId, datos.idDeck]
    );
  }
}
