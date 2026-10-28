import { Persistencia } from '../../persistencia/Persistencia';
import { FlashcardPendiente } from './entidades';

// Caso de uso para obtener tarjetas vencidas de un usuario.
export class ListarFlashcardsPendientes {
    constructor(private readonly persistencia: Persistencia) {}

    async ejecutar(usuarioId: number): Promise<FlashcardPendiente[]> {
        // CURRENT_DATE incluye también las tarjetas que vencen hoy.
        const filas = await this.persistencia.ejecutar(
            `
            SELECT f.id_flashcard, f.id_deck, d.nombre AS nombre_deck,
                f.pregunta, f.respuesta, f.proxima_revision,
                f.ultima_revision, f.ultimo_resultado
            FROM flashcards f
            INNER JOIN decks d ON d.id_deck = f.id_deck
            WHERE d.id_usuario = $1 AND f.proxima_revision <= CURRENT_DATE
            ORDER BY f.proxima_revision, d.nombre, f.id_flashcard
            `,
            [usuarioId]
        );

        return filas.map((fila) => ({
            idFlashcard: fila.id_flashcard,
            deckId: fila.id_deck,
            nombreDeck: fila.nombre_deck,
            pregunta: fila.pregunta,
            respuesta: fila.respuesta,
            proximaRevision: fila.proxima_revision,
            ultimaRevision: fila.ultima_revision,
            ultimoResultado: fila.ultimo_resultado,
        }));
    }
}
