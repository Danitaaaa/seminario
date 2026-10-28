-- Módulo Sesión de estudio.
-- Requiere que ya existan las tablas usuarios y archivos.

-- Tipos de método de estudio elegibles en una sesión. Si el módulo de Métodos de estudio ya la creó, no se toca.
CREATE TABLE IF NOT EXISTS tipo_metodo_estudio (
  id_tipo_metodo_estudio SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE
);

-- Tipos iniciales (los del selector de la pantalla de creación). Se omiten los que ya existan.
INSERT INTO tipo_metodo_estudio (nombre)
VALUES ('Repeticiones'), ('Flashcards'), ('Mapa mental'), ('Práctica activa')
ON CONFLICT (nombre) DO NOTHING;

-- Materia asociada a las sesiones (entidad Materia del subsistema Gestión de Sesión de Estudio).
CREATE TABLE IF NOT EXISTS materia (
  id_materia SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE
);

-- Sesión de estudio. La duración es la planificada (en minutos) y la define el usuario.
-- fecha_inicio y fecha_fin son los tiempos reales, usados para calcular lo estudiado.
CREATE TABLE IF NOT EXISTS sesion_estudio (
  id_sesion_estudio SERIAL PRIMARY KEY,
  id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  id_materia INT NOT NULL REFERENCES materia(id_materia),
  nombre VARCHAR(100) NOT NULL,
  duracion INT NOT NULL CHECK (duracion BETWEEN 1 AND 720),
  estado VARCHAR(20) NOT NULL DEFAULT 'sin_empezar'
    CHECK (estado IN ('sin_empezar', 'en_curso', 'atrasada', 'completada')),
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_programada TIMESTAMPTZ NOT NULL,
  fecha_ultimo_acceso TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_inicio TIMESTAMPTZ NULL,
  fecha_fin TIMESTAMPTZ NULL,
  pomodoro_min INT NOT NULL DEFAULT 35 CHECK (pomodoro_min BETWEEN 1 AND 180),
  descanso_corto_min INT NOT NULL DEFAULT 10 CHECK (descanso_corto_min BETWEEN 1 AND 60),
  descanso_largo_min INT NOT NULL DEFAULT 15 CHECK (descanso_largo_min BETWEEN 1 AND 120),
  recibir_notificacion BOOLEAN NOT NULL DEFAULT false,
  -- Contenido del editor en HTML; el mismo texto se guarda como .docx en Material.
  contenido TEXT NOT NULL DEFAULT '',
  id_archivo INT NULL REFERENCES archivos(id_archivo) ON DELETE SET NULL,
  CHECK (fecha_fin IS NULL OR fecha_inicio IS NOT NULL),
  CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

-- Un usuario no puede tener más de una sesión en curso a la vez.
CREATE UNIQUE INDEX IF NOT EXISTS uq_sesion_estudio_en_curso
  ON sesion_estudio (id_usuario) WHERE estado = 'en_curso';

-- Listados por usuario ordenados por fecha (lista de sesiones y calendario).
CREATE INDEX IF NOT EXISTS ix_sesion_estudio_usuario_fecha
  ON sesion_estudio (id_usuario, fecha_programada);

-- Relación N a N entre sesión y métodos de estudio.
CREATE TABLE IF NOT EXISTS sesion_estudio_metodo_estudio (
  id_sesion_estudio INT NOT NULL REFERENCES sesion_estudio(id_sesion_estudio) ON DELETE CASCADE,
  id_tipo_metodo_estudio INT NOT NULL REFERENCES tipo_metodo_estudio(id_tipo_metodo_estudio),
  PRIMARY KEY (id_sesion_estudio, id_tipo_metodo_estudio)
);

-- Metas que se escriben al crear la sesión y se tildan durante la misma.
CREATE TABLE IF NOT EXISTS objetivo_sesion (
  id_objetivo SERIAL PRIMARY KEY,
  id_sesion_estudio INT NOT NULL REFERENCES sesion_estudio(id_sesion_estudio) ON DELETE CASCADE,
  descripcion VARCHAR(300) NOT NULL,
  completado BOOLEAN NOT NULL DEFAULT false,
  orden INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS ix_objetivo_sesion_sesion
  ON objetivo_sesion (id_sesion_estudio, orden);

-- Para bases creadas con una versión anterior de este script.
ALTER TABLE sesion_estudio ADD COLUMN IF NOT EXISTS contenido TEXT NOT NULL DEFAULT '';
ALTER TABLE sesion_estudio ADD COLUMN IF NOT EXISTS id_archivo INT NULL REFERENCES archivos(id_archivo) ON DELETE SET NULL;
