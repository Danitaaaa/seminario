CREATE TABLE IF NOT EXISTS flashcards (
    id_flashcard INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_deck INTEGER NOT NULL REFERENCES decks(id_deck) ON DELETE CASCADE,
    pregunta TEXT NOT NULL,
    respuesta TEXT NOT NULL,
    proxima_revision DATE NOT NULL DEFAULT CURRENT_DATE,
    ultima_revision TIMESTAMP,
    ultimo_resultado VARCHAR(20),
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
