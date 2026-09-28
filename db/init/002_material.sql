CREATE TABLE IF NOT EXISTS nodos (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo TEXT NOT NULL CHECK (tipo IN ('archivo', 'carpeta')),
    nombre TEXT NOT NULL,
    extension TEXT,
    ruta_fisica TEXT,
    tamanio BIGINT,
    fecha_de_carga TIMESTAMP NOT NULL DEFAULT NOW(),
    ultima_fecha_acceso TIMESTAMP,
    ultima_fecha_modificacion TIMESTAMP,
    nodo_padre_id INTEGER REFERENCES nodos(id) ON DELETE CASCADE,
    usuario_id INTEGER,
    proyecto_id INTEGER,
    CONSTRAINT chk_extension_segun_tipo CHECK (
        (tipo = 'archivo' AND extension IS NOT NULL AND ruta_fisica IS NOT NULL)
        OR
        (tipo = 'carpeta' AND extension IS NULL AND ruta_fisica IS NULL)
    ),
    CONSTRAINT chk_un_solo_dueño CHECK (
        (usuario_id IS NOT NULL AND proyecto_id IS NULL)
        OR
        (usuario_id IS NULL AND proyecto_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_nodos_padre ON nodos (nodo_padre_id);
CREATE INDEX IF NOT EXISTS idx_nodos_usuario ON nodos (usuario_id);
CREATE INDEX IF NOT EXISTS idx_nodos_proyecto ON nodos (proyecto_id);