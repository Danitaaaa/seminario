import { Deck, Flashcard } from "./entidades";

export function materializarDeck(
    fila: any
): Deck {

    return {
        idDeck: fila.id_deck,
        usuarioId: fila.id_usuario,
        nombre: fila.nombre,
        descripcion: fila.descripcion,
        materiaAsociada: fila.materia_asociada,
        fechaCreacion: fila.fecha_creacion,
        cantidadFlashcards: Number(fila.cantidad_flashcards ?? 0),
        ultimaRevision: fila.ultima_revision ?? null,
    };
}

export function materializarFlashcard(fila: any): Flashcard {
    return {
        idFlashcard: fila.id_flashcard,
        deckId: fila.id_deck,
        pregunta: fila.pregunta,
        respuesta: fila.respuesta,
        fechaCreacion: fila.fecha_creacion,
    };
}