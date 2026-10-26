-- Imagen propia para el banner de inicio (NULL: se usan los colores de la paleta).
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS fondo_inicio TEXT NULL;