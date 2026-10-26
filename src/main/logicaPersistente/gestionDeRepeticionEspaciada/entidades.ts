export interface FlashcardPendiente {
    idFlashcard: number;
    deckId: number;
    nombreDeck: string;
    pregunta: string;
    respuesta: string;
    proximaRevision: Date;
    ultimaRevision: Date | null;
    ultimoResultado: 'dificil' | 'intermedio' | 'facil' | null;
}

export interface RepeticionMaterial {
    nodoId: number;
    nombre: string;
    intervaloDias: number;
    proximaRevision: Date;
}
