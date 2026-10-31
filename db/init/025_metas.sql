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

-- El índice único de id_global lo crea 027_sincronizacion.sql, después de agregar la columna.