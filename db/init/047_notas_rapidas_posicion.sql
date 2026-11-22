-- Las notas rápidas se pueden mover por la pantalla de la carpeta.
-- pos_x: porcentaje del ancho (0 a 100); pos_y: píxeles desde arriba. NULL = lugar por defecto.
ALTER TABLE notas_rapidas ADD COLUMN IF NOT EXISTS pos_x REAL CHECK (pos_x BETWEEN 0 AND 100);
ALTER TABLE notas_rapidas ADD COLUMN IF NOT EXISTS pos_y REAL CHECK (pos_y >= 0);
 