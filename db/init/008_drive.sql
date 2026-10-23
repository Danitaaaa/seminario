-- Enlace del archivo con su copia en Google Drive (NULL si nunca se subió).
ALTER TABLE archivos ADD COLUMN IF NOT EXISTS drive_id VARCHAR(100) NULL;