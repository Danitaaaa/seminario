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
  DELETE FROM metas WHERE id_usuario = ANY(demo);
  DELETE FROM usuarios WHERE id_usuario = ANY(demo);

  -- Carpeta de Material con los archivos de ejemplo, en todos sus niveles.
  SELECT id_nodo INTO carpeta FROM nodos WHERE id_padre = 1 AND nombre = 'Material de demo';
  IF carpeta IS NOT NULL THEN
    WITH RECURSIVE arbol AS (
      SELECT id_nodo FROM nodos WHERE id_nodo = carpeta
      UNION ALL
      SELECT n.id_nodo FROM nodos n JOIN arbol a ON n.id_padre = a.id_nodo
    )
    SELECT array_agg(id_nodo) INTO nodos_proyectos FROM arbol;
    DELETE FROM repeticiones_material WHERE id_nodo = ANY(nodos_proyectos);
    DELETE FROM archivos WHERE id_padre = ANY(nodos_proyectos);
    DELETE FROM nodos WHERE id_nodo = ANY(nodos_proyectos);
  END IF;
END $$;

-- La formación y las materias de Sofi se borran solas con su usuario.
-- Las materias sueltas que cargaba la versión anterior de la demo, si ya nadie las usa.
DELETE FROM materia m
 WHERE m.id_formacion IS NULL
   AND m.nombre IN ('Análisis Matemático', 'Física', 'Seminario de Integración', 'Base de Datos', 'Inglés Técnico')
   AND NOT EXISTS (SELECT 1 FROM sesion_estudio s WHERE s.id_materia = m.id_materia);

COMMIT;
