CREATE TABLE IF NOT EXISTS metas (
    id_meta SERIAL PRIMARY KEY,
    id_proyecto INT REFERENCES proyectos(id_proyecto) ON DELETE CASCADE,
    id_meta_origen INT REFERENCES metas(id_meta) ON DELETE SET NULL,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    mes DATE NOT NULL,                              -- primer día del mes (2026-10-01)
    completada BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_completada TIMESTAMP,
    completada_por INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    orden INT NOT NULL DEFAULT 0,
    creada_por INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (mes = date_trunc('month', mes)::date),
    CHECK (completada = (fecha_completada IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_metas_origen ON metas (id_meta_origen) WHERE id_meta_origen IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS metas_id_global_uq ON metas (id_global);

CREATE UNIQUE INDEX IF NOT EXISTS eventos_id_global_uq ON eventos (id_global);
CREATE UNIQUE INDEX IF NOT EXISTS tareas_id_global_uq ON tareas (id_global);