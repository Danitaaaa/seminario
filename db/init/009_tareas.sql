-- División de tareas de un proyecto
-- Requiere las tablas `proyectos`, `usuarios` y `cola_sincronizacion`.
-- Una tarea pertenece a un proyecto y puede estar sin asignar (id_asignado NULL)
-- o asignada a un integrante. El orden es relativo a la columna (proyecto + asignado).

CREATE TABLE IF NOT EXISTS tareas (
    id_tarea SERIAL PRIMARY KEY,
    id_proyecto INT REFERENCES proyectos(id_proyecto) ON DELETE CASCADE,
    titulo VARCHAR(200) NOT NULL,
    descripcion VARCHAR(1000),
    prioridad VARCHAR(10) NOT NULL DEFAULT 'media' CHECK (prioridad IN ('alta', 'media', 'baja')),
    fecha_limite DATE,                          -- fecha de calendario, sin hora
    id_asignado INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    completada BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_completada TIMESTAMP,
    completada_por INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    orden INT NOT NULL DEFAULT 0 CHECK (orden >= 0),
    creada_por INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    -- `completada` y `fecha_completada` siempre van juntas
    CHECK (completada = (fecha_completada IS NOT NULL))
);

-- Tablero: todas las tareas de un proyecto agrupadas por columna y ordenadas
CREATE INDEX IF NOT EXISTS idx_tareas_columna
ON tareas (id_proyecto, id_asignado, orden);

-- Reparto equitativo y carga por integrante: solo importan las pendientes
CREATE INDEX IF NOT EXISTS idx_tareas_pendientes
ON tareas (id_proyecto, id_asignado) WHERE completada = FALSE;

CREATE INDEX IF NOT EXISTS idx_tareas_asignado ON tareas (id_asignado);

-- La cola de sincronización debe aceptar la nueva entidad.
-- (Si preferís, agregá 'tarea' directamente en el CHECK de 003_proyectos.sql y omití esto.)
ALTER TABLE cola_sincronizacion DROP CONSTRAINT IF EXISTS cola_sincronizacion_entidad_check;
ALTER TABLE cola_sincronizacion ADD CONSTRAINT cola_sincronizacion_entidad_check
    CHECK (entidad IN ('proyecto', 'miembro', 'nodo', 'archivo', 'evento', 'meta', 'tarea'));
