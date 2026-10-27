-- Color de cada materia: indice del tono de la paleta activa (ver utils/tonos.ts).
-- NULL = todavia no se eligio, se usa uno automatico segun el nombre.
ALTER TABLE horarios_cursado
  ADD COLUMN IF NOT EXISTS tono SMALLINT CHECK (tono BETWEEN 0 AND 5);