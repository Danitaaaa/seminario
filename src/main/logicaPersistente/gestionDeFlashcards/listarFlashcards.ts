import { Persistencia } from '../../persistencia/Persistencia';
import { Flashcard } from './entidades';
import { materializarFlashcard } from './materializador';

export class ListarFlashcards {
    constructor(private readonly persistencia: Persistencia) {}

    async ejecutar(usuarioId: number, deckId: number): Promise<Flashcard[]> {
        const filas = await this.persistencia.ejecutar(
            `
            SELECT f.*
            FROM flashcards f
            INNER JOIN decks d ON d.id_deck = f.id_deck
            WHERE d.id_usuario = $1 AND d.id_deck = $2
            ORDER BY f.fecha_creacion, f.id_flashcard
            `,
            [usuarioId, deckId]
        );

        return filas.map(materializarFlashcard);
    }
}
