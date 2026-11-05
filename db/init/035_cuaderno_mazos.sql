-- Mazos que el usuario agrega a mano a un cuaderno. Los de la materia (por nombre)
-- y los usados en sesiones de estudio de esa materia ya aparecen solos.
CREATE TABLE IF NOT EXISTS cuaderno_mazo (
  id_cuaderno INT NOT NULL REFERENCES cuaderno(id_cuaderno) ON DELETE CASCADE,
  id_deck INT NOT NULL REFERENCES decks(id_deck) ON DELETE CASCADE,
  PRIMARY KEY (id_cuaderno, id_deck)
);
