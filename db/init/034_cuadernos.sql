-- Cuadernos: los crea el usuario con un nombre y les asocia una materia (uno por materia).
-- El cuaderno junta lo de esa materia: carpetas de Material, mazos, sesiones, y sus propias notas.
CREATE TABLE IF NOT EXISTS cuaderno (
  id_cuaderno SERIAL PRIMARY KEY,
  id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  id_materia INT NOT NULL UNIQUE REFERENCES materia(id_materia) ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cuaderno_usuario ON cuaderno (id_usuario);

-- Notas del cuaderno: parciales, recuperatorios, TP, finales...
-- El estado sale de la nota (7 o más aprobado, menos de 4 desaprobado, de 4 a 6 sin definir)
-- y el usuario lo puede cambiar, porque en algunas universidades se aprueba con 4.
CREATE TABLE IF NOT EXISTS nota (
  id_nota SERIAL PRIMARY KEY,
  id_cuaderno INT NOT NULL REFERENCES cuaderno(id_cuaderno) ON DELETE CASCADE,
  tipo VARCHAR(15) NOT NULL CHECK (tipo IN ('parcial', 'recuperatorio', 'tp', 'final', 'otro')),
  nombre VARCHAR(100) NOT NULL,
  fecha DATE,
  nota NUMERIC(4,2) CHECK (nota BETWEEN 0 AND 10),
  estado VARCHAR(12) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'aprobado', 'desaprobado', 'sin_definir')),
  fecha_creacion TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS nota_cuaderno ON nota (id_cuaderno);
