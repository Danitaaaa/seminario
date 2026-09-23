CREATE TABLE IF NOT EXISTS nodos (
    id_nodo SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    fecha_carga TIMESTAMP NOT NULL,
    ultima_fecha_acceso TIMESTAMP NOT NULL,
    ultima_fecha_modificacion TIMESTAMP NOT NULL,
    tamaño BIGINT NOT NULL,
    id_padre INT REFERENCES nodos(id_nodo) ON DELETE RESTRICT,
    Unique(id_nodo, id_padre)
);

CREATE INDEX IF NOT EXISTS idx_nodos_nombre_trgm 
ON nodos USING GIN (nombre gin_trgm_ops);