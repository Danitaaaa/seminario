-- Metas mensuales: personales (id_proyecto NULL, las del dashboard) o de un proyecto.
CREATE TABLE IF NOT EXISTS metas (
    id_meta SERIAL PRIMARY KEY,
    id_proyecto INT REFERENCES proyectos(id_proyecto) ON DELETE CASCADE,
    id_meta_origen INT REFERENCES metas(id_meta) ON DELETE SET NULL,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    mes DATE NOT NULL,                              -- primer día del mes (2026-10-01)
    fecha_limite DATE,                              -- opcional: el día en que vence (cronograma y avisos)
    completada BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_completada TIMESTAMP,
    orden INT NOT NULL DEFAULT 0,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (mes = date_trunc('month', mes)::date),
    CHECK (completada = (fecha_completada IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_metas_origen ON metas (id_meta_origen) WHERE id_meta_origen IS NOT NULL;

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
-- El índice único de id_global lo crea 027_sincronizacion.sql, después de agregar la columna.