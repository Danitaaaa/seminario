-- Bienestar: Syntra avisa cuando planificás o estudiás demasiado en un día. Se puede desactivar.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS bienestar_activo BOOLEAN NOT NULL DEFAULT TRUE;
