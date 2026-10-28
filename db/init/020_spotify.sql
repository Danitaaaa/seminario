-- Cuenta de Spotify vinculada por cada usuario.
-- El refresh token se guarda cifrado con safeStorage de Electron (credenciales del sistema operativo).
-- El access token dura una hora y se mantiene solo en memoria.
-- Base existente: docker exec -i app_postgres psql -U <usuario> -d studyAppDB < db/init/010_spotify.sql
CREATE TABLE IF NOT EXISTS spotify_cuenta (
  id_usuario INT PRIMARY KEY REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL,
  cifrado BOOLEAN NOT NULL DEFAULT true,
  alcances TEXT NOT NULL DEFAULT '',
  fecha_vinculacion TIMESTAMPTZ NOT NULL DEFAULT now()
);
