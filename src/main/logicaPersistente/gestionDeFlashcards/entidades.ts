export interface Deck {
    idDeck: number;
    usuarioId: number;
    nombre: string;
    descripcion: string | null;
    materiaAsociada: string | null;
    fechaCreacion: Date;
    cantidadFlashcards: number;
    ultimaRevision: Date | null;
}

export interface Flashcard {
    idFlashcard: number;
    deckId: number;
    pregunta: string;
    respuesta: string;
    fechaCreacion: Date;
}