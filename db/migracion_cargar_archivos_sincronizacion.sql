-- =====================================================================
-- Encola UNA SOLA VEZ el contenido que ya existía antes de activar la sincronización.
-- Correr en cada base (studyAppDB_1 y studyAppDB_2), ANTES del primer inicio de sesión con la app nueva.
--
-- Solo toca proyectos SIN id_remoto (todavía no publicados): al publicarse, SincronizarProyecto
-- sube esta cola. Los proyectos a los que te uniste ya tienen id_remoto y no se tocan.
-- Es re-ejecutable: no duplica lo que ya está en la cola.
-- =====================================================================
BEGIN;

-- 1) Nodos (padres antes que hijos). Se excluye la raíz del proyecto: cada PC tiene la suya.
WITH RECURSIVE arbol AS (
    SELECT p.id_proyecto, p.id_nodo_raiz, n.id_nodo, n.id_global, n.id_padre, n.nombre, 0 AS prof
    FROM proyectos p JOIN nodos n ON n.id_nodo = p.id_nodo_raiz
    WHERE p.id_remoto IS NULL
    UNION ALL
    SELECT a.id_proyecto, a.id_nodo_raiz, n.id_nodo, n.id_global, n.id_padre, n.nombre, a.prof + 1
    FROM nodos n JOIN arbol a ON n.id_padre = a.id_nodo
)
INSERT INTO cola_sincronizacion (id_proyecto, entidad, id_entidad, operacion, payload)
SELECT a.id_proyecto, 'nodo', a.id_nodo, 'crear',
       jsonb_build_object('idGlobal', a.id_global,
         'datos', jsonb_build_object('nombre', a.nombre,
                                     'padre_global', pa.id_global,
                                     'padre_es_raiz', a.id_padre = a.id_nodo_raiz))
FROM arbol a
JOIN nodos pa ON pa.id_nodo = a.id_padre
WHERE a.prof > 0
  AND NOT EXISTS (SELECT 1 FROM cola_sincronizacion c
                  WHERE c.id_proyecto = a.id_proyecto AND c.entidad = 'nodo' AND c.operacion = 'crear'
                    AND c.payload->>'idGlobal' = a.id_global::text)
ORDER BY a.prof, a.id_nodo;

-- 2) Archivos (el contenido sube por el camino de versiones: 'crear' los marca como pendientes).
INSERT INTO cola_sincronizacion (id_proyecto, entidad, id_entidad, operacion, payload)
SELECT p.id_proyecto, 'archivo', ar.id_archivo, 'crear',
       jsonb_build_object('idGlobal', ar.id_global,
         'datos', jsonb_build_object('nombre', ar.nombre, 'extension', ar.extension,
                                     'padre_global', n.id_global,
                                     'padre_es_raiz', n.id_nodo = p.id_nodo_raiz))
FROM archivos ar
JOIN nodos n ON n.id_nodo = ar.id_padre
JOIN proyectos p ON p.id_remoto IS NULL AND EXISTS (
    WITH RECURSIVE anc AS (
        SELECT id_nodo, id_padre FROM nodos WHERE id_nodo = ar.id_padre
        UNION ALL
        SELECT x.id_nodo, x.id_padre FROM nodos x JOIN anc ON x.id_nodo = anc.id_padre
    ) SELECT 1 FROM anc WHERE anc.id_nodo = p.id_nodo_raiz)
WHERE NOT EXISTS (SELECT 1 FROM cola_sincronizacion c
                  WHERE c.id_proyecto = p.id_proyecto AND c.entidad = 'archivo' AND c.operacion = 'crear'
                    AND c.payload->>'idGlobal' = ar.id_global::text);

-- 3) Tareas, eventos y metas de proyectos sin publicar (viajan solo con idGlobal; el estado completo sube por leer()).
INSERT INTO cola_sincronizacion (id_proyecto, entidad, id_entidad, operacion, payload)
SELECT t.id_proyecto, 'tarea', t.id_tarea, 'crear', jsonb_build_object('idGlobal', t.id_global)
FROM tareas t JOIN proyectos p ON p.id_proyecto = t.id_proyecto
WHERE p.id_remoto IS NULL
  AND NOT EXISTS (SELECT 1 FROM cola_sincronizacion c WHERE c.id_proyecto = t.id_proyecto
                  AND c.entidad = 'tarea' AND c.operacion = 'crear' AND c.payload->>'idGlobal' = t.id_global::text);

INSERT INTO cola_sincronizacion (id_proyecto, entidad, id_entidad, operacion, payload)
SELECT e.id_proyecto, 'evento', e.id, 'crear', jsonb_build_object('idGlobal', e.id_global)
FROM eventos e JOIN proyectos p ON p.id_proyecto = e.id_proyecto
WHERE p.id_remoto IS NULL
  AND NOT EXISTS (SELECT 1 FROM cola_sincronizacion c WHERE c.id_proyecto = e.id_proyecto
                  AND c.entidad = 'evento' AND c.operacion = 'crear' AND c.payload->>'idGlobal' = e.id_global::text);

INSERT INTO cola_sincronizacion (id_proyecto, entidad, id_entidad, operacion, payload)
SELECT m.id_proyecto, 'meta', m.id_meta, 'crear', jsonb_build_object('idGlobal', m.id_global)
FROM metas m JOIN proyectos p ON p.id_proyecto = m.id_proyecto
WHERE p.id_remoto IS NULL
  AND NOT EXISTS (SELECT 1 FROM cola_sincronizacion c WHERE c.id_proyecto = m.id_proyecto
                  AND c.entidad = 'meta' AND c.operacion = 'crear' AND c.payload->>'idGlobal' = m.id_global::text);

-- 4) Sube la versión local de los proyectos afectados (igual que registrarCambio).
UPDATE proyectos SET version = version + 1 WHERE id_remoto IS NULL;

COMMIT;
