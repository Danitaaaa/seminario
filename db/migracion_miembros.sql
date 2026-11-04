ALTER TABLE proyecto_miembros ALTER COLUMN id_usuario DROP NOT NULL;
ALTER TABLE proyecto_miembros ADD COLUMN IF NOT EXISTS mail VARCHAR(255);

ALTER TABLE proyecto_miembros DROP CONSTRAINT IF EXISTS chk_miembro_identidad;
ALTER TABLE proyecto_miembros ADD CONSTRAINT chk_miembro_identidad
    CHECK (id_usuario IS NOT NULL OR mail IS NOT NULL);

-- Con id_usuario NULL el índice uq_miembro_activo no protege: este sí.
CREATE UNIQUE INDEX IF NOT EXISTS uq_miembro_activo_global
ON proyecto_miembros (id_proyecto, id_global_usuario) WHERE fecha_baja IS NULL;

-- El trigger ahora también deriva el id global desde el mail cuando no hay usuario local.
CREATE OR REPLACE FUNCTION trg_miembro_id_global() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.id_global_usuario IS NULL THEN
        IF NEW.id_usuario IS NOT NULL THEN
            SELECT id_global_de_mail(u.email) INTO NEW.id_global_usuario
            FROM usuarios u WHERE u.id_usuario = NEW.id_usuario;
        ELSIF NEW.mail IS NOT NULL THEN
            NEW.id_global_usuario := id_global_de_mail(NEW.mail);
        END IF;
    END IF;
    RETURN NEW;
END $$;