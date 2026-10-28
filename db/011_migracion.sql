-- Ejecutar en AMBAS bases (puertos 5433 y 5434). No agrega trasladada_a: esa columna no existe en el esquema real.
-- ON CONFLICT (id_global) exige un índice único.
CREATE UNIQUE INDEX IF NOT EXISTS metas_id_global_uq ON metas (id_global);

-- Chequeo equivalente para el resto de entidades sincronizadas:
CREATE UNIQUE INDEX IF NOT EXISTS eventos_id_global_uq ON eventos (id_global);
CREATE UNIQUE INDEX IF NOT EXISTS tareas_id_global_uq ON tareas (id_global);