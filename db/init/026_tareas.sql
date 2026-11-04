DROP TABLE IF EXISTS tareas CASCADE;

-- Tareas de un proyecto (id_proyecto) o personales (id_proyecto NULL, con dueño en id_usuario).
-- Las personales no se asignan a nadie.
CREATE TABLE tareas (
    id_tarea SERIAL PRIMARY KEY,
    id_global UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    id_proyecto INT REFERENCES proyectos(id_proyecto) ON DELETE CASCADE,
    id_usuario INT REFERENCES usuarios(id_usuario) ON DELETE CASCADE,    -- dueño de una tarea personal
    titulo VARCHAR(200) NOT NULL,
    descripcion VARCHAR(1000),
    prioridad VARCHAR(10) NOT NULL DEFAULT 'media' CHECK (prioridad IN ('alta', 'media', 'baja')),
    fecha_limite DATE,
    fecha_inicio DATE,
    id_asignado INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,  -- proyecto personal
    id_asignado_global UUID,                                             -- proyecto compartido
    completada BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_completada TIMESTAMP,
    orden INT NOT NULL DEFAULT 0 CHECK (orden >= 0),
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (completada = (fecha_completada IS NOT NULL)),
    CHECK (fecha_inicio IS NULL OR fecha_limite IS NULL OR fecha_inicio <= fecha_limite),
    CHECK (id_asignado IS NULL OR id_asignado_global IS NULL),
    -- Personal => tiene dueño. De proyecto => no lo necesita.
    CONSTRAINT tareas_dueno_chk CHECK (id_proyecto IS NOT NULL OR id_usuario IS NOT NULL),
    CONSTRAINT tareas_personal_sin_asignar_chk
        CHECK (id_proyecto IS NOT NULL OR (id_asignado IS NULL AND id_asignado_global IS NULL))
);

CREATE INDEX idx_tareas_columna ON tareas (id_proyecto, id_asignado, id_asignado_global, orden);
CREATE INDEX idx_tareas_pendientes ON tareas (id_proyecto) WHERE completada = FALSE;
CREATE INDEX idx_tareas_usuario ON tareas (id_usuario, orden) WHERE id_usuario IS NOT NULL;