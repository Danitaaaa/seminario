-- Gestión de proyectos
-- Requiere las tablas `nodos`, `archivos` (gestión de material de estudio) y `usuarios`.
-- Cada proyecto tiene un nodo raíz propio (carpeta) del que cuelgan todas sus carpetas y archivos.

-- uuid_generate_v5: se usa para derivar el id global de un usuario a partir de su mail.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
    -- Id del usuario compartido entre PCs (los id_usuario locales no coinciden). Lo completa el trigger de abajo.
    id_global_usuario UUID,
    CHECK (fecha_baja IS NULL OR fecha_baja >= fecha_union)
);

-- Un usuario solo puede tener una membresía activa por proyecto (puede reingresar tras una baja).
CREATE UNIQUE INDEX IF NOT EXISTS uq_miembro_activo
ON proyecto_miembros (id_proyecto, id_usuario) WHERE fecha_baja IS NULL;

CREATE INDEX IF NOT EXISTS idx_miembros_usuario ON proyecto_miembros (id_usuario);

-- El id global se deriva del mail (UUID v5): la misma persona tiene el mismo id en cualquier
-- computadora, sin conexión y sin que nadie lo asigne. El trigger lo completa en cada alta de
-- membresía, así que el código que inserta en proyecto_miembros no necesita calcularlo.
-- NO cambiar el namespace: cambiaría el id global de todos los usuarios.
CREATE OR REPLACE FUNCTION id_global_de_mail(p_mail TEXT) RETURNS UUID
LANGUAGE sql IMMUTABLE AS $$
    SELECT uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
                            'usuario:' || lower(btrim(p_mail)))
$$;

CREATE OR REPLACE FUNCTION trg_miembro_id_global() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.id_global_usuario IS NULL THEN
        SELECT id_global_de_mail(u.email) INTO NEW.id_global_usuario
        FROM usuarios u WHERE u.id_usuario = NEW.id_usuario;
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS miembro_id_global ON proyecto_miembros;
CREATE TRIGGER miembro_id_global
    BEFORE INSERT ON proyecto_miembros
    FOR EACH ROW EXECUTE FUNCTION trg_miembro_id_global();

-- Invitaciones para ser miembro de un proyecto
CREATE TABLE IF NOT EXISTS proyecto_invitaciones (
    id_invitacion SERIAL PRIMARY KEY,
    id_proyecto INT NOT NULL REFERENCES proyectos(id_proyecto) ON DELETE CASCADE,
    mail_invitado VARCHAR(255) NOT NULL CHECK (mail_invitado = LOWER(mail_invitado)),
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('editor', 'lector')),
    invitado_por INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    codigo_hash CHAR(64) NOT NULL,
    intentos INT NOT NULL DEFAULT 0,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_vencimiento TIMESTAMP NOT NULL,
    UNIQUE (id_proyecto, mail_invitado)
);
CREATE INDEX IF NOT EXISTS idx_invitaciones_mail ON proyecto_invitaciones (mail_invitado);

-- Cola de cambios locales pendientes de enviar al servidor de sincronización.
CREATE TABLE IF NOT EXISTS cola_sincronizacion (
    id_cambio BIGSERIAL PRIMARY KEY,
    id_proyecto INT NOT NULL REFERENCES proyectos(id_proyecto) ON DELETE CASCADE,
    entidad VARCHAR(20) NOT NULL CHECK (entidad IN ('proyecto', 'miembro', 'nodo', 'archivo', 'evento', 'meta', 'tarea', 'categoria')),
    id_entidad INT NOT NULL,
    operacion VARCHAR(20) NOT NULL CHECK (operacion IN ('crear', 'modificar', 'eliminar', 'mover')),
    payload JSONB,
    fecha_cambio TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_envio TIMESTAMP                       -- NULL = pendiente
);

CREATE INDEX IF NOT EXISTS idx_cola_pendientes
ON cola_sincronizacion (id_proyecto, id_cambio) WHERE fecha_envio IS NULL;


ALTER TABLE proyecto_miembros ALTER COLUMN id_usuario DROP NOT NULL;
ALTER TABLE proyecto_miembros ADD COLUMN IF NOT EXISTS mail VARCHAR(255);

ALTER TABLE proyecto_miembros DROP CONSTRAINT IF EXISTS chk_miembro_identidad;
ALTER TABLE proyecto_miembros ADD CONSTRAINT chk_miembro_identidad
    CHECK (id_usuario IS NOT NULL OR mail IS NOT NULL);

ALTER TABLE proyecto_miembros ADD COLUMN IF NOT EXISTS id_global_usuario UUID;
CREATE INDEX IF NOT EXISTS idx_miembros_global
  ON proyecto_miembros (id_global_usuario) WHERE id_global_usuario IS NOT NULL;

-- Con id_usuario NULL el índice uq_miembro_activo no protege: este sí.
CREATE UNIQUE INDEX IF NOT EXISTS uq_miembro_activo_global
ON proyecto_miembros (id_proyecto, id_global_usuario) WHERE fecha_baja IS NULL;

-- El trigger ahora también deriva el id global desde el mail cuando no hay usuario local.
CREATE OR REPLACE FUNCTION trg_miembro_id_global() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.id_global_usuario IS NULL THEN
        IF NEW.id_usuario IS NOT NULL THEN
            SELECT id_global_de_mail(u.email) INTO NEW.id_global_usuario
            FROM usuarios u WHERE u.id_usuario = NEW.id_usuario;
        ELSIF NEW.mail IS NOT NULL THEN
            NEW.id_global_usuario := id_global_de_mail(NEW.mail);
        END IF;
    END IF;
    RETURN NEW;
END $$;