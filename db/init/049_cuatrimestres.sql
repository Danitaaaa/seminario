-- Cuatrimestres de cursada del usuario (valen para todas sus formaciones), con fechas y recesos.
-- Los horarios y los cuadernos quedan en un cuatrimestre: así Google Calendar repite las clases
-- solo hasta el fin de la cursada y los cuadernos se agrupan por cuatrimestre.
CREATE TABLE IF NOT EXISTS cuatrimestre (
  id_cuatrimestre SERIAL PRIMARY KEY,
  id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  anio SMALLINT NOT NULL CHECK (anio BETWEEN 2000 AND 2100),
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('primero', 'segundo')),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  CONSTRAINT cuatrimestre_fechas CHECK (fecha_fin > fecha_inicio),
  CONSTRAINT cuatrimestre_unico UNIQUE (id_usuario, anio, tipo)
);

-- Feriados y vacaciones dentro del cuatrimestre: esos días no hay clases.
CREATE TABLE IF NOT EXISTS cuatrimestre_receso (
  id_receso SERIAL PRIMARY KEY,
  id_cuatrimestre INT NOT NULL REFERENCES cuatrimestre(id_cuatrimestre) ON DELETE CASCADE,
  desde DATE NOT NULL,
  hasta DATE NOT NULL,
  descripcion VARCHAR(60),
  CONSTRAINT receso_fechas CHECK (hasta >= desde)
);
CREATE INDEX IF NOT EXISTS receso_cuatrimestre ON cuatrimestre_receso (id_cuatrimestre);

-- Cada horario es de un cuatrimestre (NULL = cargado antes de que existieran) y, si se eligió, de una materia.
ALTER TABLE horarios_cursado
  ADD COLUMN IF NOT EXISTS id_cuatrimestre INT REFERENCES cuatrimestre(id_cuatrimestre) ON DELETE CASCADE;
ALTER TABLE horarios_cursado
  ADD COLUMN IF NOT EXISTS id_materia INT REFERENCES materia(id_materia) ON DELETE SET NULL;

-- Un cuaderno por cada vez que se cursa la materia: uno por materia y cuatrimestre.
ALTER TABLE cuaderno
  ADD COLUMN IF NOT EXISTS id_cuatrimestre INT REFERENCES cuatrimestre(id_cuatrimestre) ON DELETE SET NULL;
ALTER TABLE cuaderno DROP CONSTRAINT IF EXISTS cuaderno_id_materia_key;
CREATE UNIQUE INDEX IF NOT EXISTS cuaderno_materia_cuatrimestre
  ON cuaderno (id_materia, COALESCE(id_cuatrimestre, 0));

-- La misma cursada puede contar para la materia de otra formación (dos carreras con una materia en común).
CREATE TABLE IF NOT EXISTS cuaderno_materia_extra (
  id_cuaderno INT NOT NULL REFERENCES cuaderno(id_cuaderno) ON DELETE CASCADE,
  id_materia INT NOT NULL REFERENCES materia(id_materia) ON DELETE CASCADE,
  PRIMARY KEY (id_cuaderno, id_materia)
);
