import { Persistencia } from '../../persistencia/Persistencia';
import { CrearFlashcardDTO } from './dto';
import { Flashcard } from './entidades';
import { materializarFlashcard } from './materializador';

export class CrearFlashcard {
    constructor(private readonly persistencia: Persistencia) {}

    async ejecutar(datos: CrearFlashcardDTO): Promise<Flashcard> {
        const filas = await this.persistencia.ejecutar(
            `
            INSERT INTO flashcards (id_deck, pregunta, respuesta)
            SELECT d.id_deck, $3, $4
            FROM decks d
            WHERE d.id_deck = $2 AND d.id_usuario = $1
            RETURNING *
            `,
            [datos.usuarioId, datos.deckId, datos.pregunta, datos.respuesta]
        );

        if (!filas[0]) {
            throw new Error('No se encontró el mazo para crear la flashcard.');
        }

        return materializarFlashcard(filas[0]);
    }
}
