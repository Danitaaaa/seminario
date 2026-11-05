-- Notas del cuaderno de cada materia: parciales, recuperatorios, TP, finales...
-- El estado sale de la nota (7 o más aprobado, menos de 4 desaprobado, de 4 a 6 sin definir)
-- y el usuario lo puede cambiar, porque en algunas universidades se aprueba con 4.
CREATE TABLE IF NOT EXISTS nota (
  id_nota SERIAL PRIMARY KEY,
  id_materia INT NOT NULL REFERENCES materia(id_materia) ON DELETE CASCADE,
  tipo VARCHAR(15) NOT NULL CHECK (tipo IN ('parcial', 'recuperatorio', 'tp', 'final', 'otro')),
  nombre VARCHAR(100) NOT NULL,
  fecha DATE,
  nota NUMERIC(4,2) CHECK (nota BETWEEN 0 AND 10),
  estado VARCHAR(12) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'aprobado', 'desaprobado', 'sin_definir')),
  fecha_creacion TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS nota_materia ON nota (id_materia);
