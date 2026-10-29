import { Persistencia } from '../../persistencia/Persistencia';
import { ModificarDeckDTO } from './dto';

// Cambia el nombre de un mazo únicamente si pertenece al usuario indicado.
export class ModificarDeck {
    constructor(private readonly persistencia: Persistencia) {}

    async ejecutar(datos: ModificarDeckDTO): Promise<void> {
        const filas = await this.persistencia.ejecutar(
            `
            UPDATE decks
               SET nombre = $3
             WHERE id_usuario = $1
               AND id_deck = $2
            RETURNING id_deck
            `,
            [datos.usuarioId, datos.deckId, datos.nombre]
        );

        if (!filas[0]) {
            throw new Error('No se encontró el mazo para editarlo.');
        }
    }
}
