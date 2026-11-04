-- Categorías de eventos: personales (usuario_id) o de un proyecto (id_proyecto, compartidas entre sus miembros).
-- Las 6 categorías base (Clases, Parciales, Trabajos, Exámenes, Entregas, Otro) NO se guardan por proyecto:
-- las aporta la aplicación. Acá solo viven las que crea el usuario o los miembros de un proyecto.
CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER,                                                        -- dueño de una categoría personal
  id_proyecto INTEGER REFERENCES proyectos(id_proyecto) ON DELETE CASCADE,   -- categoría de un proyecto
  nombre TEXT NOT NULL,
  UNIQUE (usuario_id, nombre),
  -- Personal (usuario) o de proyecto, nunca ambas ni ninguna.
  CONSTRAINT categorias_dueno_chk CHECK ((usuario_id IS NULL) <> (id_proyecto IS NULL))
);

-- Un nombre por proyecto. Es también el índice con el que se listan al abrir el proyecto.
CREATE UNIQUE INDEX IF NOT EXISTS uq_categorias_proyecto
  ON categorias (id_proyecto, nombre) WHERE id_proyecto IS NOT NULL;
-- El id_global y su índice único los agrega 027_sincronizacion.sql.

INSERT INTO categorias (usuario_id, nombre) VALUES
  (1, 'Clases'), (1, 'Parciales'), (1, 'Trabajos'),
  (1, 'Exámenes'), (1, 'Entregas'), (1, 'Otro')
ON CONFLICT (usuario_id, nombre) DO NOTHING;

ALTER TABLE eventos DROP CONSTRAINT IF EXISTS eventos_categoria_check;