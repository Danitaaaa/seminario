-- Cada vez que el usuario resuelve un cuestionario generado con IA (materiales_ia de tipo 'cuestionario').
-- La corrección la hace el main: acá queda el resultado para ver el historial y los temas a reforzar.
CREATE TABLE IF NOT EXISTS intentos_cuestionario (
  id_intento SERIAL PRIMARY KEY,
  id_material_ia INT NOT NULL REFERENCES materiales_ia(id_material_ia) ON DELETE CASCADE,
  id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  -- Lo que respondió en cada pregunta: índice de opción, texto escrito o null si la dejó en blanco.
  respuestas JSONB NOT NULL,
  correctas INT NOT NULL,
  total INT NOT NULL,
  -- [{ tema, errores, total }] de los temas en los que se equivocó.
  temas_a_reforzar JSONB NOT NULL DEFAULT '[]',
  fecha TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS intentos_cuestionario_material_idx ON intentos_cuestionario (id_material_ia, fecha DESC);
