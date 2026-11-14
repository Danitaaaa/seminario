-- Chat con IA: imágenes que el usuario adjunta a sus mensajes (JPEG en base64, ya achicadas por la app).
ALTER TABLE mensajes_ia ADD COLUMN IF NOT EXISTS imagenes JSONB NOT NULL DEFAULT '[]';
