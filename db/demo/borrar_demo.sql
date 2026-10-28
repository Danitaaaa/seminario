-- Borra todo lo que cargó datos_demo.sql (usuarios @syntra.demo y la carpeta "Material de demo").
-- No toca nada de los usuarios reales. Se puede correr las veces que quieras.
-- Uso: npm run db:demo:borrar

BEGIN;

DO $$
DECLARE
  demo INT[] := ARRAY(SELECT id_usuario FROM usuarios WHERE email LIKE '%@syntra.demo');
  proyectos_demo INT[];
  nodos_proyectos INT[];
  carpeta INT;
BEGIN
  -- Proyectos donde participa algún usuario demo (con sus tareas, metas, eventos e integrantes).
  proyectos_demo := ARRAY(SELECT DISTINCT id_proyecto FROM proyecto_miembros WHERE id_usuario = ANY(demo));
  nodos_proyectos := ARRAY(SELECT id_nodo_raiz FROM proyectos WHERE id_proyecto = ANY(proyectos_demo));
  DELETE FROM proyectos WHERE id_proyecto = ANY(proyectos_demo);
  DELETE FROM archivos WHERE id_padre = ANY(nodos_proyectos);
  DELETE FROM nodos WHERE id_nodo = ANY(nodos_proyectos);

  -- Lo personal de los usuarios demo (eventos, horarios, sesiones y categorías se borran con el usuario).
  DELETE FROM metas WHERE creada_por = ANY(demo);
  DELETE FROM tareas WHERE creada_por = ANY(demo);
  DELETE FROM usuarios WHERE id_usuario = ANY(demo);

  -- Carpeta de Material con los archivos de ejemplo (dos niveles).
  SELECT id_nodo INTO carpeta FROM nodos WHERE id_padre = 1 AND nombre = 'Material de demo';
  IF carpeta IS NOT NULL THEN
    DELETE FROM archivos WHERE id_padre IN (SELECT id_nodo FROM nodos WHERE id_padre = carpeta) OR id_padre = carpeta;
    DELETE FROM nodos WHERE id_padre = carpeta;
    DELETE FROM nodos WHERE id_nodo = carpeta;
  END IF;
END $$;

-- Las materias son compartidas entre usuarios: no se borran.

COMMIT;
