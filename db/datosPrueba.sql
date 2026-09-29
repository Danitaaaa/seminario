BEGIN;

INSERT INTO nodos (id_nodo, nombre, fecha_carga, ultima_fecha_acceso, ultima_fecha_modificacion, tamaño, id_padre)
VALUES
    -- Raíz
    (1,  'Raíz',            '2026-01-10 09:00:00', '2026-09-24 10:00:00', '2026-01-10 09:00:00', 0, NULL),

    -- Nivel 1
    (2,  'Documentos',      '2026-01-10 09:05:00', '2026-09-20 15:30:00', '2026-03-02 11:00:00', 0, 1),
    (3,  'Imágenes',        '2026-01-12 10:00:00', '2026-09-18 08:45:00', '2026-01-12 10:00:00', 0, 1),
    (4,  'Videos',          '2026-01-15 14:20:00', '2026-08-30 09:10:00', '2026-01-15 14:20:00', 0, 1),
    (5,  'Descargas',       '2026-01-18 16:00:00', '2026-09-24 09:00:00', '2026-06-01 12:00:00', 0, 1),
    (6,  'Proyectos',       '2026-02-01 08:30:00', '2026-09-22 17:00:00', '2026-07-15 10:00:00', 0, 1),

    -- Dentro de Documentos
    (7,  'Facultad',        '2026-01-11 09:10:00', '2026-09-15 10:00:00', '2026-01-11 09:10:00', 0, 2),
    (8,  'Trabajos',        '2026-01-20 11:00:00', '2026-09-10 13:20:00', '2026-04-05 09:00:00', 0, 2),

    -- Dentro de Facultad
    (9,  'Materias',        '2026-01-11 09:20:00', '2026-09-01 08:00:00', '2026-01-11 09:20:00', 0, 7),
    (10, 'Apuntes',         '2026-02-05 10:00:00', '2026-08-20 09:30:00', '2026-02-05 10:00:00', 0, 7),

    -- Dentro de Materias
    (11, 'Matemática',      '2026-01-12 09:00:00', '2026-07-30 11:00:00', '2026-01-12 09:00:00', 0, 9),
    (12, 'Física',          '2026-01-13 09:00:00', '2026-07-28 11:00:00', '2026-01-13 09:00:00', 0, 9),

    -- Dentro de Imágenes
    (14, 'Capturas',        '2026-02-10 09:00:00', '2026-09-05 14:00:00', '2026-02-10 09:00:00', 0, 3),

    -- Dentro de Proyectos
    (15, 'App Nodos',       '2026-02-01 08:40:00', '2026-09-24 10:00:00', '2026-09-24 10:00:00', 0, 6),
    (16, 'Backend',         '2026-02-02 09:00:00', '2026-09-24 09:50:00', '2026-09-20 16:00:00', 0, 15),
    (17, 'Frontend',        '2026-02-02 09:05:00', '2026-09-24 09:55:00', '2026-09-23 18:30:00', 0, 15);

INSERT INTO archivos (id_archivo, nombre, extension, ruta_fisica, fecha_carga, ultima_fecha_acceso, ultima_fecha_modificacion, tamaño, id_padre)
VALUES
    -- Raíz
    (1,  'Leeme',                   'txt',  'seed/leeme.txt',                   '2026-01-10 09:30:00', '2026-09-24 10:00:00', '2026-01-10 09:30:00',      1240, 1),
    (2,  'Cronograma 2026',         'xlsx', 'seed/cronograma-2026.xlsx',        '2026-01-14 10:00:00', '2026-09-22 09:00:00', '2026-08-01 16:00:00',     58320, 1),

    -- Documentos
    (3,  'Curriculum',              'pdf',  'seed/curriculum.pdf',              '2026-03-02 11:00:00', '2026-09-20 15:30:00', '2026-03-02 11:00:00',    214560, 2),
    (4,  'Contrato de alquiler',    'pdf',  'seed/contrato-alquiler.pdf',       '2026-02-15 12:00:00', '2026-06-10 08:00:00', '2026-02-15 12:00:00',    843200, 2),

    -- Trabajos
    (5,  'Informe final',           'docx', 'seed/informe-final.docx',          '2026-04-05 09:00:00', '2026-09-10 13:20:00', '2026-04-05 09:00:00',    102400, 8),
    (6,  'Presentación TP1',        'pptx', 'seed/presentacion-tp1.pptx',       '2026-04-20 18:00:00', '2026-09-09 11:00:00', '2026-05-02 20:15:00',   3145728, 8),

    -- Apuntes
    (7,  'Resumen unidad 1',        'pdf',  'seed/resumen-unidad-1.pdf',        '2026-02-05 10:30:00', '2026-08-20 09:30:00', '2026-02-05 10:30:00',    462800, 10),
    (8,  'Resumen unidad 2',        'pdf',  'seed/resumen-unidad-2.pdf',        '2026-03-10 10:30:00', '2026-08-20 09:35:00', '2026-03-10 10:30:00',    518400, 10),

    -- Matemática
    (9,  'Guía de ejercicios',      'pdf',  'seed/guia-ejercicios-mate.pdf',    '2026-01-12 09:30:00', '2026-07-30 11:00:00', '2026-01-12 09:30:00',   1048576, 11),
    (10, 'Formulario de derivadas', 'png',  'seed/formulario-derivadas.png',    '2026-02-01 09:00:00', '2026-07-30 11:10:00', '2026-02-01 09:00:00',    327680, 11),

    -- Física
    (11, 'Laboratorio 1',           'docx', 'seed/laboratorio-1.docx',          '2026-01-13 09:30:00', '2026-07-28 11:00:00', '2026-03-18 17:00:00',     90112, 12),
    (12, 'Tabla de constantes',     'pdf',  'seed/tabla-constantes.pdf',        '2026-01-13 09:40:00', '2026-07-28 11:05:00', '2026-01-13 09:40:00',    256000, 12),

    -- Imágenes
    (13, 'Logo',                    'svg',  'seed/logo.svg',                    '2026-01-12 10:10:00', '2026-09-18 08:45:00', '2026-01-12 10:10:00',      4096, 3),

    -- Capturas
    (16, 'Captura de pantalla',     'png',  'seed/captura-pantalla.png',        '2026-02-10 09:10:00', '2026-09-05 14:00:00', '2026-02-10 09:10:00',    786432, 14),

    -- Videos
    (17, 'Clase grabada',           'mp4',  'seed/clase-grabada.mp4',           '2026-01-15 14:30:00', '2026-08-30 09:10:00', '2026-01-15 14:30:00', 157286400, 4),

    -- Descargas
    (18, 'Instalador',              'zip',  'seed/instalador.zip',              '2026-06-01 12:00:00', '2026-09-24 09:00:00', '2026-06-01 12:00:00',  52428800, 5),

    -- Backend
    (19, 'Esquema de base de datos','sql',  'seed/esquema.sql',                 '2026-02-02 09:30:00', '2026-09-24 09:50:00', '2026-09-20 16:00:00',      8192, 16),
    (20, 'Notas de API',            'md',   'seed/notas-api.md',                '2026-02-03 10:00:00', '2026-09-24 09:52:00', '2026-09-19 11:00:00',      6144, 16),

    -- Frontend
    (21, 'Diseño de pantallas',     'pdf',  'seed/diseno-pantallas.pdf',        '2026-02-02 09:30:00', '2026-09-24 09:55:00', '2026-09-23 18:30:00',   1572864, 17),
    (22, 'Paleta de colores',       'png',  'seed/paleta-colores.png',          '2026-02-04 15:00:00', '2026-09-24 09:57:00', '2026-02-04 15:00:00',     40960, 17);

-- Resincronizar las secuencias de los SERIAL para que el próximo INSERT
-- automático (sin id explícito) continúe desde el máximo id insertado.
SELECT setval(
    pg_get_serial_sequence('nodos', 'id_nodo'),
    (SELECT MAX(id_nodo) FROM nodos)
);

SELECT setval(
    pg_get_serial_sequence('archivos', 'id_archivo'),
    (SELECT MAX(id_archivo) FROM archivos)
);

COMMIT;