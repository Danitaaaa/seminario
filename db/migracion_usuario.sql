-- Identificador de usuario compartido entre computadoras.
-- Los id_usuario locales no coinciden entre PCs, así que la sincronización de tareas
-- (y de cualquier cosa asignada a alguien) tiene que hablar en ids globales.
--
-- Idempotente: se puede correr sobre una base que ya lo tenga.
-- IMPORTANTE: esto solo crea las columnas. Los valores de usuarios.id_global_usuario
-- tienen que salir de un identificador estable de la persona (por ejemplo, el id de su
-- cuenta en Supabase). NO usar gen_random_uuid() por PC: dos PCs generarían ids distintos
-- para la misma persona y la asignación de tareas no coincidiría.

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS id_global_usuario UUID;

CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_id_global
    ON usuarios (id_global_usuario) WHERE id_global_usuario IS NOT NULL;

ALTER TABLE proyecto_miembros
    ADD COLUMN IF NOT EXISTS id_global_usuario UUID;

-- Copia el global de cada usuario a sus membresías (las que ya tengan valor no se tocan).
UPDATE proyecto_miembros pm
SET id_global_usuario = u.id_global_usuario
FROM usuarios u
WHERE u.id_usuario = pm.id_usuario
  AND pm.id_global_usuario IS NULL
  AND u.id_global_usuario IS NOT NULL;


  -- Identificador global del usuario dentro de cada membresía de proyecto.
-- Lo leen ObtenerPerfil.getIdGlobal y ManejadorTarea (pm.id_global_usuario).
-- Idempotente: se puede correr sobre una base que ya lo tenga.

ALTER TABLE proyecto_miembros
    ADD COLUMN IF NOT EXISTS id_global_usuario UUID;

-- Identificador global del usuario dentro de cada membresía de proyecto.
-- Lo leen ObtenerPerfil.getIdGlobal, buscarTarea, repartirTareas y ManejadorTarea (pm.id_global_usuario).
--
-- El id se deriva del mail (UUID v5): la misma persona tiene el mismo id en cualquier
-- computadora, sin conexión y sin que nadie lo asigne. Un trigger lo completa en cada alta
-- de membresía, así que no hace falta tocar el código que inserta en proyecto_miembros.
--
-- NO cambiar el namespace: cambiaría el id global de todos los usuarios.
-- Idempotente: se puede correr más de una vez.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE proyecto_miembros
    ADD COLUMN IF NOT EXISTS id_global_usuario UUID;

CREATE OR REPLACE FUNCTION id_global_de_mail(p_mail TEXT) RETURNS UUID
LANGUAGE sql IMMUTABLE AS $$
    SELECT uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
                            'usuario:' || lower(btrim(p_mail)))
$$;

CREATE OR REPLACE FUNCTION trg_miembro_id_global() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.id_global_usuario IS NULL THEN
        SELECT id_global_de_mail(u.email) INTO NEW.id_global_usuario
        FROM usuarios u WHERE u.id_usuario = NEW.id_usuario;
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS miembro_id_global ON proyecto_miembros;
CREATE TRIGGER miembro_id_global
    BEFORE INSERT ON proyecto_miembros
    FOR EACH ROW EXECUTE FUNCTION trg_miembro_id_global();

-- Completa las membresías que ya existían (las que ya tienen valor no se tocan).
UPDATE proyecto_miembros pm
SET id_global_usuario = id_global_de_mail(u.email)
FROM usuarios u
WHERE u.id_usuario = pm.id_usuario
  AND pm.id_global_usuario IS NULL;