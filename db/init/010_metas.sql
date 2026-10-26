-- Metas del dashboard: tareas cortas que el usuario anota y tacha.
CREATE TABLE IF NOT EXISTS metas (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  titulo VARCHAR(120) NOT NULL,
  fecha_limite DATE NULL,
  completada BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metas_usuario ON metas (usuario_id);