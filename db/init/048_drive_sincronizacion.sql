-- Estado de la última sincronización con Google Drive, para saber de qué lado hubo cambios.
-- drive_huella: SHA-256 del archivo de Syntra en ese momento.
-- drive_modificado: fecha de modificación que informó Drive en ese momento (tal cual la devuelve la API).
ALTER TABLE archivos ADD COLUMN IF NOT EXISTS drive_huella VARCHAR(64) NULL;
ALTER TABLE archivos ADD COLUMN IF NOT EXISTS drive_modificado VARCHAR(40) NULL;
