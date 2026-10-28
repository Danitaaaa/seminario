-- Módulo Sesión de estudio: pestañas del editor, pausa y Pomodoro guardados en la base.
-- El Word de cada sesión en Material se sigue generando igual que antes.
-- Es idempotente: sirve para una base nueva y para migrar una base creada con la versión anterior.
-- Base existente: docker exec -i app_postgres psql -U <usuario> -d studyAppDB < db/init/009_sesiones_estudio_bd.sql

-- Pestañas del editor de la sesión (Pestaña 1, Pestaña 2, ...). Cada una guarda su contenido en HTML.
CREATE TABLE IF NOT EXISTS pestana_sesion (
  id_pestana SERIAL PRIMARY KEY,
  id_sesion_estudio INT NOT NULL REFERENCES sesion_estudio(id_sesion_estudio) ON DELETE CASCADE,
  titulo VARCHAR(60) NOT NULL,
  contenido TEXT NOT NULL DEFAULT '',
  orden INT NOT NULL DEFAULT 0,
  fecha_modificacion TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_pestana_sesion_sesion
  ON pestana_sesion (id_sesion_estudio, orden);

-- Migración: el contenido que ya tenía cada sesión pasa a ser su "Pestaña 1".
-- sesion_estudio.contenido se sigue usando: guarda el documento completo (todas las pestañas),
-- que es lo mismo que se escribe en el Word de Material › Sesiones de estudio.
INSERT INTO pestana_sesion (id_sesion_estudio, titulo, contenido, orden)
SELECT s.id_sesion_estudio, 'Pestaña 1', s.contenido, 0
  FROM sesion_estudio s
 WHERE NOT EXISTS (SELECT 1 FROM pestana_sesion p WHERE p.id_sesion_estudio = s.id_sesion_estudio);

-- Pausa de la sesión. Mientras está pausada sigue "en_curso" pero con fecha_pausa cargada;
-- al reanudar, el tiempo pausado se acumula en segundos_pausados y no cuenta como estudiado.
ALTER TABLE sesion_estudio ADD COLUMN IF NOT EXISTS fecha_pausa TIMESTAMPTZ NULL;
ALTER TABLE sesion_estudio ADD COLUMN IF NOT EXISTS segundos_pausados INT NOT NULL DEFAULT 0;

-- Estado del Pomodoro, para que sobreviva a recargas y reinicios de la app.
--   pomodoro_fase: fase elegida (Pomodoro, Short Break, Long Break).
--   pomodoro_restante_seg: segundos que quedaban al pausarlo; NULL = la fase completa.
--   pomodoro_corriendo_desde: momento en que se dio START; NULL = detenido.
ALTER TABLE sesion_estudio ADD COLUMN IF NOT EXISTS pomodoro_fase VARCHAR(20) NOT NULL DEFAULT 'pomodoro';
ALTER TABLE sesion_estudio ADD COLUMN IF NOT EXISTS pomodoro_restante_seg INT NULL;
ALTER TABLE sesion_estudio ADD COLUMN IF NOT EXISTS pomodoro_corriendo_desde TIMESTAMPTZ NULL;
ALTER TABLE sesion_estudio ADD COLUMN IF NOT EXISTS pomodoros_completados INT NOT NULL DEFAULT 0;

ALTER TABLE sesion_estudio DROP CONSTRAINT IF EXISTS ck_sesion_estudio_pausa;
ALTER TABLE sesion_estudio ADD CONSTRAINT ck_sesion_estudio_pausa
  CHECK (segundos_pausados >= 0 AND (fecha_pausa IS NULL OR estado = 'en_curso'));

ALTER TABLE sesion_estudio DROP CONSTRAINT IF EXISTS ck_sesion_estudio_pomodoro;
ALTER TABLE sesion_estudio ADD CONSTRAINT ck_sesion_estudio_pomodoro
  CHECK (
    pomodoro_fase IN ('pomodoro', 'descanso_corto', 'descanso_largo')
    AND (pomodoro_restante_seg IS NULL OR pomodoro_restante_seg >= 0)
    AND pomodoros_completados >= 0
  );
