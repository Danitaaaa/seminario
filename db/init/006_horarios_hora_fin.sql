-- 1. Agregar la columna si no existe
ALTER TABLE horarios_cursado ADD COLUMN IF NOT EXISTS hora_fin TEXT;

-- 2. Rellenar los nulos provisoriamente si los hubiera
UPDATE horarios_cursado
SET hora_fin = to_char((hora_inicio::time + interval '1 hour'), 'HH24:MI')
WHERE hora_fin IS NULL;

-- 3. Asegurar que sea NOT NULL (si ya lo es, no da error grave, pero lo ideal es aplicarlo)
ALTER TABLE horarios_cursado ALTER COLUMN hora_fin SET NOT NULL;

-- 4. Agregar restricciones de forma segura (verificando si ya existen en la base)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'horarios_hora_fin_formato'
    ) THEN
        ALTER TABLE horarios_cursado ADD CONSTRAINT horarios_hora_fin_formato CHECK (hora_fin ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'horarios_hora_fin_posterior'
    ) THEN
        ALTER TABLE horarios_cursado ADD CONSTRAINT horarios_hora_fin_posterior CHECK (hora_fin > hora_inicio);
    END IF;
END $$;