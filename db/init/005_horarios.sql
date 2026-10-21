CREATE TABLE IF NOT EXISTS horarios_cursado (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio TEXT NOT NULL CHECK (hora_inicio ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  hora_fin TEXT NOT NULL CHECK (hora_fin ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  titulo TEXT NOT NULL,
  CONSTRAINT horarios_hora_fin_posterior CHECK (hora_fin > hora_inicio)
);
