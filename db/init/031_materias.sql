-- Formaciones del usuario (carrera, curso, academia...) y sus materias.
-- Se puede correr sobre una base que ya existe: no borra datos.

CREATE TABLE IF NOT EXISTS formacion (
  id_formacion SERIAL PRIMARY KEY,
  id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('grado', 'pregrado', 'posgrado', 'curso', 'academia', 'otro')),
  nombre VARCHAR(150) NOT NULL,
  institucion VARCHAR(150),
  duracion_anios SMALLINT CHECK (duracion_anios BETWEEN 1 AND 10),
  organizacion VARCHAR(20) NOT NULL DEFAULT 'cuatrimestral'
    CHECK (organizacion IN ('cuatrimestral', 'anual', 'modulos', 'sin_division')),
  anio_actual SMALLINT CHECK (anio_actual BETWEEN 1 AND 10),
  fecha_creacion TIMESTAMP NOT NULL DEFAULT now()
);

-- Las materias que ya existían quedan sin formación (id_formacion NULL) y se siguen pudiendo usar en las sesiones.
ALTER TABLE materia ADD COLUMN IF NOT EXISTS id_formacion INT REFERENCES formacion(id_formacion) ON DELETE CASCADE;
ALTER TABLE materia ADD COLUMN IF NOT EXISTS anio SMALLINT CHECK (anio BETWEEN 1 AND 10);
ALTER TABLE materia ADD COLUMN IF NOT EXISTS cuatrimestre VARCHAR(10) CHECK (cuatrimestre IN ('primero', 'segundo', 'anual'));
ALTER TABLE materia ADD COLUMN IF NOT EXISTS estado VARCHAR(12) NOT NULL DEFAULT 'no_cursada';
-- Se vuelve a crear la regla para que la base que ya tenía la versión anterior acepte "cursando".
ALTER TABLE materia DROP CONSTRAINT IF EXISTS materia_estado_check;
ALTER TABLE materia ADD CONSTRAINT materia_estado_check
  CHECK (estado IN ('no_cursada', 'cursando', 'libre', 'regular', 'aprobada'));

-- El nombre ya no es único en toda la app: solo dentro de cada formación.
ALTER TABLE materia DROP CONSTRAINT IF EXISTS materia_nombre_key;
CREATE UNIQUE INDEX IF NOT EXISTS materia_formacion_nombre ON materia (id_formacion, nombre);
CREATE INDEX IF NOT EXISTS formacion_usuario ON formacion (id_usuario);

-- La duración admite medios años (2,5 = dos años y medio).
ALTER TABLE formacion DROP CONSTRAINT IF EXISTS formacion_duracion_anios_check;
ALTER TABLE formacion ALTER COLUMN duracion_anios TYPE NUMERIC(3,1);
ALTER TABLE formacion ADD CONSTRAINT formacion_duracion_anios_check
  CHECK (duracion_anios BETWEEN 0.5 AND 10 AND duracion_anios * 2 = trunc(duracion_anios * 2));

-- Cuatrimestre que está cursando ahora: con el año actual decide qué materias salen "Cursando".
ALTER TABLE formacion ADD COLUMN IF NOT EXISTS cuatrimestre_actual VARCHAR(10)
  CHECK (cuatrimestre_actual IN ('primero', 'segundo'));
