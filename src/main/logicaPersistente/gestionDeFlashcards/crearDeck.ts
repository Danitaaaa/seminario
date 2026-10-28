import { Persistencia } from "../../persistencia/Persistencia";
import { CrearDeckDTO } from "./dto";
import { Deck } from "./entidades";
import { materializarDeck } from "./materializador";

export class CrearDeck {

    constructor(
        private readonly persistencia: Persistencia
    ) {}

    // Persiste los datos del mazo y convierte la fila devuelta a la entidad.
    async ejecutar(
        datos: CrearDeckDTO
    ): Promise<Deck> {

        const filas =
            await this.persistencia.ejecutar(
                `
                INSERT INTO decks
                (
                    id_usuario,
                    nombre,
                    descripcion,
                    materia_asociada
                )
                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4
                )
                RETURNING *
                `,
                [
                    datos.usuarioId,
                    datos.nombre,
                    datos.descripcion ?? null,
                    datos.materiaAsociada ?? null
                ]
            );

        return materializarDeck(
            filas[0]
        );
    }
}