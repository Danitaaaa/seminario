-- Correlatividades: qué materias (de la misma formación) necesita cada materia.
CREATE TABLE IF NOT EXISTS materia_correlativa (
  id_materia INT NOT NULL REFERENCES materia(id_materia) ON DELETE CASCADE,
  id_requisito INT NOT NULL REFERENCES materia(id_materia) ON DELETE CASCADE,
  PRIMARY KEY (id_materia, id_requisito),
  CHECK (id_materia <> id_requisito)
);
CREATE INDEX IF NOT EXISTS materia_correlativa_requisito ON materia_correlativa (id_requisito);
