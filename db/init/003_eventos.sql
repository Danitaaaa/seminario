CREATE TABLE IF NOT EXISTS eventos (
  id SERIAL PRIMARY KEY,
usuario_id INTEGER NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  lugar TEXT,
  fecha TIMESTAMP NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Otro'
    CHECK (categoria IN ('Clases', 'Parciales', 'Trabajos', 'Exámenes', 'Entregas', 'Otro')),
  prioridad TEXT NOT NULL DEFAULT 'media'
    CHECK (prioridad IN ('leve', 'media', 'importante')),
  notificaciones_activas BOOLEAN NOT NULL DEFAULT FALSE,
  recordatorios JSONB NOT NULL DEFAULT '[]'::jsonb
);
