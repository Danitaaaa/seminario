import { Persistencia } from '../../persistencia/Persistencia';
import { EliminarFlashcardsDTO } from './dto';

// Elimina las tarjetas seleccionadas solo dentro de mazos del usuario.
export class EliminarFlashcards {
    constructor(private readonly persistencia: Persistencia) {}

    async ejecutar(datos: EliminarFlashcardsDTO): Promise<number> {
        const filas = await this.persistencia.ejecutar(
            `
            DELETE FROM flashcards f
             USING decks d
             WHERE f.id_deck = d.id_deck
               AND d.id_usuario = $1
               AND f.id_flashcard = ANY($2::integer[])
            RETURNING f.id_flashcard
            `,
            [datos.usuarioId, datos.flashcardIds]
        );

        return filas.length;
    }
}
