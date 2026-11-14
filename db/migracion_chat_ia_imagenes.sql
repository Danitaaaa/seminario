-- Para bases que ya existen (db/init solo corre cuando se crea el volumen de Docker).
-- Ejecutar en AMBAS bases. Mismo contenido que init/039_chat_ia_imagenes.sql. Va después de migracion_chat_ia.sql.

-- Chat con IA: imágenes que el usuario adjunta a sus mensajes (JPEG en base64, ya achicadas por la app).
ALTER TABLE mensajes_ia ADD COLUMN IF NOT EXISTS imagenes JSONB NOT NULL DEFAULT '[]';
