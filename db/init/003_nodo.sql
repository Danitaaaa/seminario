CREATE TABLE IF NOT EXISTS nodos (
    id_nodo SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    fecha_carga TIMESTAMP NOT NULL,
    ultima_fecha_acceso TIMESTAMP NOT NULL,
    ultima_fecha_modificacion TIMESTAMP NOT NULL,
    tamaño BIGINT NOT NULL,
    -- NO ACTION: sigue impidiendo borrar una carpeta con contenido, pero la verificación
    -- se hace al final de la sentencia, así se puede borrar un subárbol completo de una vez.
    id_padre INT REFERENCES nodos(id_nodo) ON DELETE NO ACTION
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
    id_padre INT NOT NULL REFERENCES nodos(id_nodo) ON DELETE NO ACTION,
    UNIQUE (nombre, extension, id_padre)
);

CREATE INDEX IF NOT EXISTS idx_archivos_padre ON archivos (id_padre);
CREATE INDEX IF NOT EXISTS idx_archivos_nombre_trgm
ON archivos USING GIN (nombre gin_trgm_ops);

INSERT INTO nodos (id_nodo, nombre, fecha_carga, ultima_fecha_acceso, ultima_fecha_modificacion, tamaño, id_padre)
VALUES
  (1, 'Raíz', NOW(), NOW(), NOW(), 0, NULL),
  (2, 'Proyectos', NOW(), NOW(), NOW(), 0, NULL)
ON CONFLICT (id_nodo) DO NOTHING;
SELECT setval(pg_get_serial_sequence('nodos','id_nodo'), (SELECT MAX(id_nodo) FROM nodos));