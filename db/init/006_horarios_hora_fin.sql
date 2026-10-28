-- Correr en psql (con \i), sobre tu tabla horarios_cursado existente.

ALTER TABLE horarios_cursado ADD COLUMN IF NOT EXISTS hora_fin TEXT;

-- Para los horarios que ya tenías cargados sin hora de fin, les ponemos
-- provisoriamente "una hora después" de la hora de inicio. Si alguno
-- duraba más o menos que eso en la realidad, corregilo a mano después
-- desde la pantalla de Horarios (ahora que ya tiene el campo).
UPDATE horarios_cursado
SET hora_fin = to_char((hora_inicio::time + interval '1 hour'), 'HH24:MI')
WHERE hora_fin IS NULL;

ALTER TABLE horarios_cursado
  DROP CONSTRAINT IF EXISTS horarios_hora_fin_formato,
  DROP CONSTRAINT IF EXISTS horarios_hora_fin_posterior;