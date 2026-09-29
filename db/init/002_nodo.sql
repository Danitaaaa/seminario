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


CREATE TABLE IF NOT EXISTS archivos (
    id_archivo SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    extension VARCHAR(20) NOT NULL,
    ruta_fisica TEXT NOT NULL,
    fecha_carga TIMESTAMP NOT NULL DEFAULT NOW(),
    ultima_fecha_acceso TIMESTAMP NOT NULL DEFAULT NOW(),
    ultima_fecha_modificacion TIMESTAMP NOT NULL DEFAULT NOW(),
    tamaño BIGINT NOT NULL,
    id_padre INT NOT NULL REFERENCES nodos(id_nodo) ON DELETE RESTRICT,
    UNIQUE (nombre, extension, id_padre)
);

CREATE INDEX IF NOT EXISTS idx_archivos_padre ON archivos (id_padre);
CREATE INDEX IF NOT EXISTS idx_archivos_nombre_trgm
ON archivos USING GIN (nombre gin_trgm_ops);