import { Persistencia } from '../../persistencia/Persistencia';
import { EliminarDecksDTO } from './dto';

// Elimina los mazos seleccionados que pertenecen al usuario.
export class EliminarDecks {
    constructor(private readonly persistencia: Persistencia) {}

    async ejecutar(datos: EliminarDecksDTO): Promise<number> {
        const filas = await this.persistencia.ejecutar(
            `
            DELETE FROM decks
             WHERE id_usuario = $1
               AND id_deck = ANY($2::integer[])
            RETURNING id_deck
            `,
            [datos.usuarioId, datos.deckIds]
        );

        return filas.length;
    }
}