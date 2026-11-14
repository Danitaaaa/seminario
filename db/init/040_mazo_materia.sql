-- Cada mazo puede pertenecer a una materia (Materia 1 — * Mazo).
-- Reemplaza a la tabla cuaderno_mazo: los mazos que estaban agregados a un cuaderno
-- pasan a la materia de ese cuaderno. Los demás quedan sin materia.
ALTER TABLE decks ADD COLUMN IF NOT EXISTS id_materia INT REFERENCES materia(id_materia) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS decks_materia ON decks (id_materia);

DO $$
BEGIN
  IF to_regclass('cuaderno_mazo') IS NOT NULL THEN
    UPDATE decks d SET id_materia = c.id_materia
      FROM cuaderno_mazo cm JOIN cuaderno c ON c.id_cuaderno = cm.id_cuaderno
     WHERE cm.id_deck = d.id_deck AND d.id_materia IS NULL;
    DROP TABLE cuaderno_mazo;
  END IF;
END $$;
