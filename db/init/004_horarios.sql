-- Correr en psql, igual que hiciste con la migración de eventos.
CREATE TABLE IF NOT EXISTS horarios_cursado (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  -- 0 = domingo ... 6 = sábado, igual que Date.getDay() en JavaScript
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio TEXT NOT NULL CHECK (hora_inicio ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  titulo TEXT NOT NULL
);
