import { Persistencia } from '../../persistencia/Persistencia';
import { RegistrarRevisionDTO } from './dto';
import { FlashcardPendiente } from './entidades';

// Intervalos de repaso según la dificultad elegida por el usuario.
const diasPorDificultad = {
    dificil: 1,
    intermedio: 3,
    facil: 6,
} as const;

// Actualiza la fecha de repaso y registra cada intento en el historial.
export class RegistrarRevision {
    constructor(private readonly persistencia: Persistencia) {}

    async ejecutar(
    datos: RegistrarRevisionDTO
): Promise<void> {

// Calcula el intervalo usado tanto en la tarjeta como en el historial.
const dias =
        diasPorDificultad[
            datos.dificultad
        ];

    // Actualiza el vencimiento y el resultado más reciente de la flashcard.
    await this.persistencia.ejecutar(
        `
        UPDATE flashcards
        SET
            proxima_revision =
                CURRENT_DATE +
                ($2 * INTERVAL '1 day'),

            ultima_revision =
                CURRENT_TIMESTAMP,

            ultimo_resultado = $3
        WHERE
            id_flashcard = $1
        `,
        [
            datos.flashcardId,
            dias,
            datos.dificultad
        ]
    );

    // Conserva una fila histórica de esta revisión y su próxima fecha.
    await this.persistencia.ejecutar(
        `
        INSERT INTO flashcard_revisiones
        (
            id_flashcard,
            dificultad,
            proxima_revision
        )
        VALUES
        (
            $1,
            $2,
            CURRENT_DATE +
            ($3 * INTERVAL '1 day')
        )
        `,
        [
            datos.flashcardId,
            datos.dificultad,
            dias
        ]
    );
}
}