import { Persistencia } from '../../persistencia/persistencia';
import { MazoCuadernoDTO } from './dto';

// Saca del cuaderno un mazo agregado a mano: le quita la materia. El mazo no se borra.
export class QuitarMazo {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: MazoCuadernoDTO): Promise<void> {
    await this.persistencia.ejecutar(
      `UPDATE decks d SET id_materia = NULL
         FROM cuaderno c
        WHERE c.id_cuaderno = $1 AND c.id_usuario = $2 AND d.id_deck = $3 AND d.id_usuario = $2
          AND d.id_materia = c.id_materia`,
      [datos.idCuaderno, datos.usuarioId, datos.idDeck]
    );
  }
}
