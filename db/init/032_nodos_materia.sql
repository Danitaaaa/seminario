-- Una carpeta de Material se puede asociar a una materia (opcional).
-- Si se borra la materia, la carpeta queda sin materia (SET NULL) en vez de borrarse.
ALTER TABLE nodos ADD COLUMN IF NOT EXISTS id_materia INT REFERENCES materia(id_materia) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_nodos_materia ON nodos (id_materia);
