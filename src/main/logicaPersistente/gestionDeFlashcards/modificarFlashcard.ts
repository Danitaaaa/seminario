import { Persistencia } from '../../persistencia/persistencia';
import { ModificarFlashcardDTO } from './dto';
import { Flashcard } from './entidades';
import { materializarFlashcard } from './materializador';

// Cambia la pregunta y la respuesta de una flashcard. Su historial de repasos no se toca.
export class ModificarFlashcard {
    constructor(private readonly persistencia: Persistencia) {}

    async ejecutar(datos: ModificarFlashcardDTO): Promise<Flashcard> {
        const filas = await this.persistencia.ejecutar(
            `
            UPDATE flashcards f
               SET pregunta = $3, respuesta = $4
              FROM decks d
             WHERE f.id_flashcard = $2
               AND d.id_deck = f.id_deck
               AND d.id_usuario = $1
            RETURNING f.*
            `,
            [datos.usuarioId, datos.idFlashcard, datos.pregunta, datos.respuesta]
        );

        // No devuelve filas si la flashcard no existe o el mazo es de otro usuario.
        if (!filas[0]) {
            throw new Error('No se encontró la flashcard para editarla.');
        }

        return materializarFlashcard(filas[0]);
    }
}
