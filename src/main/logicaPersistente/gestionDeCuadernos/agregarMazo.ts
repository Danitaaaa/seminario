import { Persistencia } from '../../persistencia/persistencia';
import { MazoCuadernoDTO } from './dto';

// Agrega a mano un mazo del usuario a uno de sus cuadernos.
export class AgregarMazo {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: MazoCuadernoDTO): Promise<void> {
    const propios = await this.persistencia.ejecutar(
      `SELECT 1 FROM cuaderno c, decks d
        WHERE c.id_cuaderno = $1 AND c.id_usuario = $2 AND d.id_deck = $3 AND d.id_usuario = $2`,
      [datos.idCuaderno, datos.usuarioId, datos.idDeck]
    );
    if (propios.length === 0) throw new Error('El cuaderno o el mazo no existen.');
    await this.persistencia.ejecutar(
      `INSERT INTO cuaderno_mazo (id_cuaderno, id_deck) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [datos.idCuaderno, datos.idDeck]
    );
  }
}
