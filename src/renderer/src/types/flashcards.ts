export interface Deck {
  idDeck: number;
  usuarioId: number;
  nombre: string;
  descripcion: string | null;
  materiaAsociada: string | null;
  fechaCreacion: string | Date;
  cantidadFlashcards?: number;
  ultimaRevision?: string | Date | null;
}

export interface Flashcard {
  idFlashcard: number;
  deckId: number;
  pregunta: string;
  respuesta: string;
  fechaCreacion: string | Date;
}

export interface FlashcardPendiente {
  idFlashcard: number;
  deckId: number;
  nombreDeck: string;
  pregunta: string;
  respuesta: string;
  proximaRevision: string | Date;
  ultimaRevision: string | Date | null;
  ultimoResultado: 'dificil' | 'intermedio' | 'facil' | null;
}

export interface RepeticionMaterial {
  nodoId: number;
  nombre: string;
  intervaloDias: number;
  proximaRevision: string | Date;
}
