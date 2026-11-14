-- Material generado con IA (resumen, cuestionario, mapa mental) que el usuario revisó y confirmó
-- en la pantalla previa. El contenido se guarda tal cual lo validó zod (ver logicaNoPersistente/ia/esquemas).
CREATE TABLE IF NOT EXISTS materiales_ia (
  id_material_ia SERIAL PRIMARY KEY,
  id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  -- Archivo de Material del que salió. Si se borra el archivo, el material generado queda.
  id_archivo INT REFERENCES archivos(id_archivo) ON DELETE SET NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('resumen', 'cuestionario', 'mapaMental')),
  titulo VARCHAR(200) NOT NULL,
  contenido JSONB NOT NULL,
  -- Qué IA respondió: azure, gemini u ollama (puede ser más de una si hubo respaldo).
  proveedores TEXT[] NOT NULL DEFAULT '{}',
  fecha_creacion TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS materiales_ia_usuario_idx ON materiales_ia (id_usuario, fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS materiales_ia_archivo_idx ON materiales_ia (id_archivo);
