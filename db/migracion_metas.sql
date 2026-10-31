ALTER TABLE metas
  ADD COLUMN IF NOT EXISTS id_usuario INT REFERENCES usuarios(id_usuario) ON DELETE CASCADE;

-- Las personales que ya existen quedaron sin dueño al borrar creada_por_global:
-- se asignan al usuario local (ajusta si hay más de uno).
UPDATE metas
SET id_usuario = (SELECT MIN(id_usuario) FROM usuarios)
WHERE id_proyecto IS NULL AND id_usuario IS NULL;

-- Personal => tiene dueño. De proyecto => no lo necesita.
ALTER TABLE metas
  ADD CONSTRAINT metas_dueno_chk CHECK (id_proyecto IS NOT NULL OR id_usuario IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_metas_usuario ON metas (id_usuario) WHERE id_usuario IS NOT NULL;