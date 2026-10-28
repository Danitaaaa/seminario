import { Persistencia } from "../../persistencia/Persistencia";
import { Deck } from "./entidades";
import { materializarDeck } from "./materializador";

export class ListarDecks {

    constructor(
        private readonly persistencia: Persistencia
    ) {}

    async ejecutar(
        usuarioId: number
    ): Promise<Deck[]> {

        // El filtro por usuario evita mezclar mazos de distintas cuentas.
        const filas =
            await this.persistencia.ejecutar(
                `
                SELECT d.*,
                    COUNT(f.id_flashcard)::int AS cantidad_flashcards,
                    MAX(f.ultima_revision) AS ultima_revision
                FROM decks d
                LEFT JOIN flashcards f ON f.id_deck = d.id_deck
                WHERE d.id_usuario = $1
                GROUP BY d.id_deck
                ORDER BY d.fecha_creacion DESC
                `,
                [usuarioId]
            );

        return filas.map(
            materializarDeck
        );
    }
}