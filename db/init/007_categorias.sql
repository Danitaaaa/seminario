CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL,
  nombre TEXT NOT NULL,
  UNIQUE (usuario_id, nombre)
);

INSERT INTO categorias (usuario_id, nombre) VALUES
  (1, 'Clases'), (1, 'Parciales'), (1, 'Trabajos'),
  (1, 'Exámenes'), (1, 'Entregas'), (1, 'Otro')
ON CONFLICT (usuario_id, nombre) DO NOTHING;

ALTER TABLE eventos DROP CONSTRAINT IF EXISTS eventos_categoria_check;



