-- Para bases que ya existen (db/init solo corre cuando se crea el volumen de Docker).
-- Ejecutar en AMBAS bases (puertos 5433 y 5434). Es el mismo contenido que init/036_materiales_ia.sql.
CREATE TABLE IF NOT EXISTS materiales_ia (
  id_material_ia SERIAL PRIMARY KEY,
  id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  id_archivo INT REFERENCES archivos(id_archivo) ON DELETE SET NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('resumen', 'cuestionario', 'mapaMental')),
  titulo VARCHAR(200) NOT NULL,
  contenido JSONB NOT NULL,
  proveedores TEXT[] NOT NULL DEFAULT '{}',
  fecha_creacion TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS materiales_ia_usuario_idx ON materiales_ia (id_usuario, fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS materiales_ia_archivo_idx ON materiales_ia (id_archivo);
