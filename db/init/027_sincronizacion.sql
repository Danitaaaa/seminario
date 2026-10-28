-- Migración de la base LOCAL (Postgres de cada PC).
-- Requiere haber corrido antes los SQL de proyectos, nodos, eventos, metas y tareas (tablas proyectos, nodos, archivos, eventos, metas, tareas).
-- Se puede ejecutar más de una vez sin errores.

-- gen_random_uuid() viene incluido desde PostgreSQL 13. Si tu Postgres es más viejo, descomentá:
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Estado de sincronización por elemento editable (versión del servidor que tengo aplicada,
-- si hay edición local sin subir y, si lo hay, el conflicto con la versión remota).
CREATE TABLE IF NOT EXISTS estado_entidad_remota (
    id_proyecto      INTEGER     NOT NULL REFERENCES proyectos(id_proyecto) ON DELETE CASCADE,
    entidad          TEXT        NOT NULL,
    id_global        UUID        NOT NULL,
    version_remota   INTEGER     NOT NULL DEFAULT 0,
    pendiente        BOOLEAN     NOT NULL DEFAULT FALSE,
    conflicto_remoto JSONB,
    actualizado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id_proyecto, entidad, id_global)
);

-- Los ids locales (SERIAL) NO sirven entre computadoras: cada elemento compartido necesita
-- un identificador global. Las filas que ya existen reciben un UUID distinto cada una.
ALTER TABLE nodos    ADD COLUMN IF NOT EXISTS id_global UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE archivos ADD COLUMN IF NOT EXISTS id_global UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE eventos  ADD COLUMN IF NOT EXISTS id_global UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE metas    ADD COLUMN IF NOT EXISTS id_global UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE tareas   ADD COLUMN IF NOT EXISTS id_global UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS uq_nodos_id_global    ON nodos (id_global);
CREATE UNIQUE INDEX IF NOT EXISTS uq_archivos_id_global ON archivos (id_global);
CREATE UNIQUE INDEX IF NOT EXISTS uq_eventos_id_global  ON eventos (id_global);
CREATE UNIQUE INDEX IF NOT EXISTS uq_metas_id_global    ON metas (id_global);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tareas_id_global   ON tareas (id_global);

-- La cola de sincronización debe aceptar todas las entidades (sin 'nota').
-- Si ya corriste 026_tareas.sql esto deja la misma restricción; es inofensivo repetirlo.
ALTER TABLE cola_sincronizacion DROP CONSTRAINT IF EXISTS cola_sincronizacion_entidad_check;
ALTER TABLE cola_sincronizacion ADD CONSTRAINT cola_sincronizacion_entidad_check
    CHECK (entidad IN ('proyecto', 'miembro', 'nodo', 'archivo', 'evento', 'meta', 'tarea'));