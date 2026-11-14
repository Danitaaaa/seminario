-- Color que el usuario eligió para su avatar en los proyectos (posición en la paleta de 10 colores).
-- NULL: se le asigna uno automático.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS color_avatar SMALLINT CHECK (color_avatar BETWEEN 0 AND 9);
