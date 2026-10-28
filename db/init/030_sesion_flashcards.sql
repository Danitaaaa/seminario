-- Mazo de flashcards (módulo de Flashcards) que se repasa dentro de una sesión de estudio.
-- Se elige al crear la sesión si se marca el método "Flashcards", o después desde el panel de métodos.
-- NULL = sin mazo. Si se borra el mazo, la sesión queda sin mazo.
-- Se puede ejecutar más de una vez sin errores.
ALTER TABLE sesion_estudio
  ADD COLUMN IF NOT EXISTS id_deck INT NULL REFERENCES decks(id_deck) ON DELETE SET NULL;
