-- Cuestionarios, mapas mentales y resúmenes hechos con IA se pueden asociar a una materia,
-- igual que los mazos (decks.id_materia): así aparecen en el cuaderno de esa materia.
ALTER TABLE materiales_ia ADD COLUMN IF NOT EXISTS id_materia INT REFERENCES materia(id_materia) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS materiales_ia_materia ON materiales_ia (id_materia);

-- Ya no se eligen métodos sueltos para el cuaderno (lo reemplaza lo de arriba).
DROP TABLE IF EXISTS cuaderno_metodo;
