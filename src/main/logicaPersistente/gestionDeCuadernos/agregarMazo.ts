import { Persistencia } from '../../persistencia/persistencia';
import { MazoCuadernoDTO } from './dto';

// Agrega a mano un mazo a un cuaderno: le asigna la materia de ese cuaderno.
export class AgregarMazo {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: MazoCuadernoDTO): Promise<void> {
    const filas = await this.persistencia.ejecutar(
      `UPDATE decks d SET id_materia = c.id_materia
         FROM cuaderno c
        WHERE c.id_cuaderno = $1 AND c.id_usuario = $2 AND d.id_deck = $3 AND d.id_usuario = $2
        RETURNING d.id_deck`,
      [datos.idCuaderno, datos.usuarioId, datos.idDeck]
    );
    if (filas.length === 0) throw new Error('El cuaderno o el mazo no existen.');
  }
}
