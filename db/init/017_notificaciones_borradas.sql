-- Avisos que el usuario borró de la campanita.
-- No se eliminan de verdad: la fila tiene que quedar para que su clave no deje que el mismo aviso vuelva a crearse.
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS borrada BOOLEAN NOT NULL DEFAULT FALSE;