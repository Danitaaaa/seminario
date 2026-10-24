-- Avisos de la campanita. La clave evita repetir el mismo aviso (ej. el mismo recordatorio de un evento).
CREATE TABLE IF NOT EXISTS notificaciones (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('evento', 'meta', 'sesion', 'proyecto')),
  titulo VARCHAR(120) NOT NULL,
  mensaje TEXT NOT NULL DEFAULT '',
  clave VARCHAR(200) NOT NULL,
  leida BOOLEAN NOT NULL DEFAULT FALSE,
  fecha TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (usuario_id, clave)
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones (usuario_id, fecha DESC);

-- Si está en TRUE, los avisos se guardan en la campanita pero no salen en las notificaciones de la compu.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS notificaciones_silenciadas BOOLEAN NOT NULL DEFAULT FALSE;