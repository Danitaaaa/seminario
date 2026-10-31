ALTER TABLE tareas
  ADD COLUMN IF NOT EXISTS id_usuario INT REFERENCES usuarios(id_usuario) ON DELETE CASCADE;

-- Dueño de las tareas sin proyecto (antes de borrar creada_por)
UPDATE tareas SET id_usuario = creada_por
WHERE id_proyecto IS NULL AND id_usuario IS NULL;
UPDATE tareas SET id_usuario = (SELECT MIN(id_usuario) FROM usuarios)
WHERE id_proyecto IS NULL AND id_usuario IS NULL;

-- Las tareas sin proyecto no se asignan
UPDATE tareas SET id_asignado = NULL, id_asignado_global = NULL WHERE id_proyecto IS NULL;

ALTER TABLE tareas
  DROP COLUMN IF EXISTS creada_por,
  DROP COLUMN IF EXISTS creada_por_global,
  DROP COLUMN IF EXISTS completada_por,
  DROP COLUMN IF EXISTS completada_por_global;

ALTER TABLE tareas
  ADD CONSTRAINT tareas_dueno_chk
    CHECK (id_proyecto IS NOT NULL OR id_usuario IS NOT NULL),
  ADD CONSTRAINT tareas_personal_sin_asignar_chk
    CHECK (id_proyecto IS NOT NULL OR (id_asignado IS NULL AND id_asignado_global IS NULL));

CREATE INDEX IF NOT EXISTS idx_tareas_usuario ON tareas (id_usuario) WHERE id_usuario IS NOT NULL;


ALTER TABLE tareas
    ADD COLUMN IF NOT EXISTS id_usuario INT REFERENCES usuarios(id_usuario) ON DELETE CASCADE;

-- Una tarea personal no tiene proyecto.
ALTER TABLE tareas ALTER COLUMN id_proyecto DROP NOT NULL;

-- Toda tarea pertenece a un proyecto o a un usuario, nunca a ambos ni a ninguno.
ALTER TABLE tareas DROP CONSTRAINT IF EXISTS tareas_proyecto_o_usuario_chk;
ALTER TABLE tareas ADD CONSTRAINT tareas_proyecto_o_usuario_chk
    CHECK ((id_proyecto IS NOT NULL) <> (id_usuario IS NOT NULL));

CREATE INDEX IF NOT EXISTS idx_tareas_personales
    ON tareas (id_usuario, orden) WHERE id_usuario IS NOT NULL;