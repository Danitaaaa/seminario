-- Carpeta raíz: la app lista y sube archivos dentro del nodo 1.
INSERT INTO nodos (id_nodo, nombre, fecha_carga, ultima_fecha_acceso, ultima_fecha_modificacion, tamaño, id_padre)
VALUES (1, 'Raíz', NOW(), NOW(), NOW(), 0, NULL)
ON CONFLICT (id_nodo) DO NOTHING;

SELECT setval(pg_get_serial_sequence('nodos', 'id_nodo'), (SELECT MAX(id_nodo) FROM nodos));
