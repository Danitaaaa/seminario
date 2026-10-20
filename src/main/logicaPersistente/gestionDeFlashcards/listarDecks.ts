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

        const filas =
            await this.persistencia.ejecutar(
                `
                SELECT *
                FROM decks
                WHERE id_usuario = $1
                ORDER BY fecha_creacion DESC
                `,
                [usuarioId]
            );

        return filas.map(
            materializarDeck
        );
    }
}