-- Para bases que ya existen (db/init solo corre cuando se crea el volumen de Docker).
-- Ejecutar en AMBAS bases (puertos 5433 y 5434). Mismo contenido que init/038_chat_ia.sql.

-- Chat con IA: conversaciones del usuario y sus mensajes (pregunta del usuario y respuesta de la IA).
CREATE TABLE IF NOT EXISTS conversaciones_ia (
  id_conversacion SERIAL PRIMARY KEY,
  id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  titulo VARCHAR(120) NOT NULL,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT now(),
  -- Se actualiza con cada mensaje: la lista se ordena por acá (la más reciente arriba).
  fecha_actualizacion TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversaciones_ia_usuario_idx ON conversaciones_ia (id_usuario, fecha_actualizacion DESC);

CREATE TABLE IF NOT EXISTS mensajes_ia (
  id_mensaje SERIAL PRIMARY KEY,
  id_conversacion INT NOT NULL REFERENCES conversaciones_ia(id_conversacion) ON DELETE CASCADE,
  rol VARCHAR(10) NOT NULL CHECK (rol IN ('usuario', 'ia')),
  texto TEXT NOT NULL,
  -- Qué IA respondió (luna, gemini o gemma). NULL en los mensajes del usuario.
  proveedor VARCHAR(20),
  fecha TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mensajes_ia_conversacion_idx ON mensajes_ia (id_conversacion, id_mensaje);
