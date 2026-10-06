ALTER TABLE eventos
  ADD COLUMN IF NOT EXISTS categoria TEXT NOT NULL DEFAULT 'Otro',
  ADD COLUMN IF NOT EXISTS prioridad TEXT NOT NULL DEFAULT 'media';

ALTER TABLE eventos
  ADD CONSTRAINT eventos_categoria_check
  CHECK (categoria IN ('Clases', 'Parciales', 'Trabajos', 'Entregas', 'Otro'));

ALTER TABLE eventos
  ADD CONSTRAINT eventos_prioridad_check
  CHECK (prioridad IN ('leve', 'media', 'importante'));

ALTER TABLE eventos RENAME COLUMN notificaciones TO notificaciones_activas;
ALTER TABLE eventos ALTER COLUMN notificaciones_activas SET DEFAULT false;

ALTER TABLE eventos
  ADD COLUMN IF NOT EXISTS recordatorios JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE eventos
SET recordatorios = '[{"cantidad": 10, "unidad": "minutos"}]'::jsonb
WHERE notificaciones_activas = true;
