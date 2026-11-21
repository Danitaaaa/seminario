-- Notas rápidas (post-its) de una carpeta de Material o de un proyecto.
-- Son de cada usuario: en una carpeta compartida, cada una ve solo las suyas.
CREATE TABLE IF NOT EXISTS notas_rapidas (
  id_nota SERIAL PRIMARY KEY,
  id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  id_nodo INT NOT NULL REFERENCES nodos(id_nodo) ON DELETE CASCADE,
  texto VARCHAR(300) NOT NULL,
  color SMALLINT NOT NULL DEFAULT 0 CHECK (color BETWEEN 0 AND 3),
  fecha_creacion TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notas_rapidas_usuario_nodo ON notas_rapidas (id_usuario, id_nodo);
