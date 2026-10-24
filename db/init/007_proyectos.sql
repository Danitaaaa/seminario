-- Gestión de proyectos
-- Requiere las tablas `nodos`, `archivos` (gestión de material de estudio) y `usuarios`.
-- Cada proyecto tiene un nodo raíz propio (carpeta) del que cuelgan todas sus carpetas y archivos.

CREATE TABLE IF NOT EXISTS proyectos (
    id_proyecto SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    --materia_asociada VARCHAR(100),
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_fin TIMESTAMP,
    enlace VARCHAR(2048),                       -- enlace de invitación (lo emite el servidor de sincronización)
    id_nodo_raiz INT NOT NULL UNIQUE REFERENCES nodos(id_nodo) ON DELETE RESTRICT,
    -- Campos de sincronización
    id_remoto VARCHAR(100) UNIQUE,              -- identificador del proyecto en el servidor externo
    version INT NOT NULL DEFAULT 1,             -- se incrementa en cada cambio local
    version_servidor INT NOT NULL DEFAULT 0,    -- última versión del servidor ya aplicada localmente
    ultima_sincronizacion TIMESTAMP,
    CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_creacion)
);

CREATE INDEX IF NOT EXISTS idx_proyectos_nombre_trgm
ON proyectos USING GIN (nombre gin_trgm_ops);

CREATE TABLE IF NOT EXISTS proyecto_miembros (
    id_proyecto_miembro SERIAL PRIMARY KEY,
    id_proyecto INT NOT NULL REFERENCES proyectos(id_proyecto) ON DELETE CASCADE,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
    rol VARCHAR(20) NOT NULL DEFAULT 'editor' CHECK (rol IN ('propietario', 'editor', 'lector')),
    fecha_union TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_baja TIMESTAMP,
    CHECK (fecha_baja IS NULL OR fecha_baja >= fecha_union)
);

-- Un usuario solo puede tener una membresía activa por proyecto (puede reingresar tras una baja).
CREATE UNIQUE INDEX IF NOT EXISTS uq_miembro_activo
ON proyecto_miembros (id_proyecto, id_usuario) WHERE fecha_baja IS NULL;

CREATE INDEX IF NOT EXISTS idx_miembros_usuario ON proyecto_miembros (id_usuario);

-- Cola de cambios locales pendientes de enviar al servidor de sincronización.
CREATE TABLE IF NOT EXISTS cola_sincronizacion (
    id_cambio BIGSERIAL PRIMARY KEY,
    id_proyecto INT NOT NULL REFERENCES proyectos(id_proyecto) ON DELETE CASCADE,
    entidad VARCHAR(20) NOT NULL CHECK (entidad IN ('proyecto', 'miembro', 'nodo', 'archivo')),
    id_entidad INT NOT NULL,
    operacion VARCHAR(20) NOT NULL CHECK (operacion IN ('crear', 'modificar', 'eliminar', 'mover')),
    payload JSONB,
    fecha_cambio TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_envio TIMESTAMP                       -- NULL = pendiente
);

CREATE INDEX IF NOT EXISTS idx_cola_pendientes
ON cola_sincronizacion (id_proyecto, id_cambio) WHERE fecha_envio IS NULL;