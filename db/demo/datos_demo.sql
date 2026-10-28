-- Datos de prueba para Syntra: un usuario con sesiones, horarios, eventos, metas,
-- dos proyectos con integrantes y tareas, y archivos en Material.
-- Las fechas se calculan a partir de HOY, así que siempre se ven "al día".
-- Antes de cargar se borra lo que haya quedado de una carga anterior (borrar_demo.sql).
--
-- Uso:  npm run db:demo          (carga o recarga)
--       npm run db:demo:borrar   (lo saca)
--
-- Entrar con:  sofi@syntra.demo / demo1234
-- Caro y Alba (caro@syntra.demo, alba@syntra.demo, misma contraseña) son las compañeras de proyecto.
-- Sofi es editora y no propietaria: así los proyectos de demo no se publican en Supabase al entrar.

BEGIN;

DO $demo$
DECLARE
  hoy DATE := CURRENT_DATE;
  mes DATE := date_trunc('month', CURRENT_DATE)::date;
  -- Contraseña "demo1234" (bcrypt, 10 rondas).
  clave TEXT := '$2b$10$gh.18O4ZJxWW1tlyFgWMDOCnv73jWgvl0wdD45PdlbRNYVgIipJL6';
  sofi INT; caro INT; alba INT;
  m_analisis INT; m_fisica INT; m_seminario INT; m_bd INT; m_ingles INT;
  ses INT;
  nodo INT; p_sem INT; p_bd INT;
  carpeta INT; sub INT;
  mazo_analisis INT; mazo_fisica INT;
  t_rep INT; t_flash INT; t_mapa INT; t_prac INT;
  i INT;
BEGIN
  -- Usuarios
  INSERT INTO usuarios (nombre, apellido, apodo, email, password_hash, email_verificado)
  VALUES ('Sofía', 'Demo', 'Sofi', 'sofi@syntra.demo', clave, TRUE) RETURNING id_usuario INTO sofi;
  INSERT INTO usuarios (nombre, apellido, apodo, email, password_hash, email_verificado)
  VALUES ('Carolina', 'Demo', 'Caro', 'caro@syntra.demo', clave, TRUE) RETURNING id_usuario INTO caro;
  INSERT INTO usuarios (nombre, apellido, apodo, email, password_hash, email_verificado)
  VALUES ('Alba', 'Demo', 'Alba', 'alba@syntra.demo', clave, TRUE) RETURNING id_usuario INTO alba;

  INSERT INTO categorias (usuario_id, nombre)
  SELECT sofi, c FROM unnest(ARRAY['Clases', 'Parciales', 'Trabajos', 'Exámenes', 'Entregas', 'Otro']) c
  ON CONFLICT (usuario_id, nombre) DO NOTHING;

  -- Materias (son compartidas: si ya existen se reutilizan)
  INSERT INTO materia (nombre)
  VALUES ('Análisis Matemático'), ('Física'), ('Seminario de Integración'), ('Base de Datos'), ('Inglés Técnico')
  ON CONFLICT (nombre) DO NOTHING;
  SELECT id_materia INTO m_analisis FROM materia WHERE nombre = 'Análisis Matemático';
  SELECT id_materia INTO m_fisica FROM materia WHERE nombre = 'Física';
  SELECT id_materia INTO m_seminario FROM materia WHERE nombre = 'Seminario de Integración';
  SELECT id_materia INTO m_bd FROM materia WHERE nombre = 'Base de Datos';
  SELECT id_materia INTO m_ingles FROM materia WHERE nombre = 'Inglés Técnico';

  -- Horarios de cursado (dia_semana: 0 domingo … 6 sábado)
  INSERT INTO horarios_cursado (usuario_id, dia_semana, hora_inicio, hora_fin, titulo, tono) VALUES
    (sofi, 1, '08:00', '10:00', 'Análisis Matemático', 0),
    (sofi, 3, '08:00', '10:00', 'Análisis Matemático', 0),
    (sofi, 2, '14:00', '18:00', 'Física', 1),
    (sofi, 4, '18:00', '22:00', 'Seminario de Integración', 2),
    (sofi, 5, '10:00', '12:00', 'Base de Datos', 3),
    (sofi, 5, '13:00', '15:00', 'Inglés Técnico', 4);

  -- Sesiones de estudio terminadas en los últimos 5 meses (una cada 6 días, alternando materia).
  FOR i IN 0..24 LOOP
    INSERT INTO sesion_estudio (id_usuario, id_materia, nombre, duracion, estado, fecha_programada,
                                fecha_inicio, fecha_fin, segundos_pausados)
    VALUES (
      sofi,
      (ARRAY[m_analisis, m_fisica, m_seminario, m_bd])[1 + i % 4],
      (ARRAY['Repaso de límites', 'Ejercicios de cinemática', 'Avance del informe', 'Consultas SQL'])[1 + i % 4],
      60 + (i % 3) * 30,
      CASE WHEN i % 7 = 3 THEN 'atrasada' ELSE 'completada' END,
      (hoy - (150 - i * 6)) + time '17:00',
      (hoy - (150 - i * 6)) + time '17:05',
      -- Algunas se cortan antes de lo planificado.
      (hoy - (150 - i * 6)) + time '17:05' + make_interval(mins => 60 + (i % 3) * 30 - CASE WHEN i % 5 = 0 THEN 20 ELSE 0 END),
      CASE WHEN i % 4 = 1 THEN 300 ELSE 0 END
    ) RETURNING id_sesion_estudio INTO ses;

    INSERT INTO objetivo_sesion (id_sesion_estudio, descripcion, completado, orden) VALUES
      (ses, 'Leer la teoría', TRUE, 0),
      (ses, 'Hacer los ejercicios', i % 3 <> 0, 1);
  END LOOP;

  -- Mazos de flashcards (con fórmulas). Algunas tarjetas vencen hoy para que haya repasos pendientes.
  INSERT INTO decks (id_usuario, nombre, descripcion, materia_asociada)
  VALUES (sofi, 'Análisis Matemático', 'Derivadas, integrales y límites', 'Análisis Matemático') RETURNING id_deck INTO mazo_analisis;
  INSERT INTO decks (id_usuario, nombre, descripcion, materia_asociada)
  VALUES (sofi, 'Física', 'Cinemática y dinámica', 'Física') RETURNING id_deck INTO mazo_fisica;

  INSERT INTO flashcards (id_deck, pregunta, respuesta, proxima_revision, ultima_revision, ultimo_resultado) VALUES
    (mazo_analisis, '¿Cuál es la derivada de $x^n$?', 'Se baja el exponente y se le resta uno: $n\,x^{n-1}$.', hoy, now() - interval '3 days', 'intermedio'),
    (mazo_analisis, '¿Cuánto vale $\int_0^1 x^2\,dx$?', 'Por la regla de Barrow: $\left[\frac{x^3}{3}\right]_0^1 = \frac{1}{3}$.', hoy - 1, now() - interval '2 days', 'dificil'),
    (mazo_analisis, '¿Cuánto vale $\lim_{x \to 0} \frac{\sin x}{x}$?', 'Vale $1$: es un límite notable.', hoy + 2, now() - interval '4 days', 'facil'),
    (mazo_analisis, '¿Cuál es la fórmula resolvente?', '$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$', hoy + 5, NULL, NULL),
    (mazo_analisis, '¿Qué dice la regla de la cadena?', '$(f \circ g)^{\prime}(x) = f^{\prime}(g(x))\,g^{\prime}(x)$', hoy, NULL, NULL),
    (mazo_fisica, '¿Qué es la velocidad media?', '$v_m = \frac{\Delta x}{\Delta t}$', hoy, now() - interval '1 day', 'dificil'),
    (mazo_fisica, '¿Qué dice la segunda ley de Newton?', '$\vec{F} = m\,\vec{a}$', hoy + 1, now() - interval '5 days', 'intermedio'),
    (mazo_fisica, '¿Cuánto vale la aceleración de la gravedad?', '$g \approx 9{,}8\ \text{m/s}^2$', hoy + 3, NULL, NULL);

  INSERT INTO flashcard_revisiones (id_flashcard, dificultad, revisado_en, proxima_revision)
  SELECT f.id_flashcard, f.ultimo_resultado, f.ultima_revision, f.proxima_revision
    FROM flashcards f
   WHERE f.id_deck IN (mazo_analisis, mazo_fisica) AND f.ultimo_resultado IS NOT NULL;

  -- Próximas sesiones sin empezar, con distintos métodos para probar el panel de la sesión:
  -- una con tres métodos y mazo, una con un solo método y una con los cuatro y sin mazo (se elige desde la sesión).
  SELECT id_tipo_metodo_estudio INTO t_rep FROM tipo_metodo_estudio WHERE nombre = 'Repeticiones';
  SELECT id_tipo_metodo_estudio INTO t_flash FROM tipo_metodo_estudio WHERE nombre = 'Flashcards';
  SELECT id_tipo_metodo_estudio INTO t_mapa FROM tipo_metodo_estudio WHERE nombre = 'Mapa mental';
  SELECT id_tipo_metodo_estudio INTO t_prac FROM tipo_metodo_estudio WHERE nombre = 'Práctica activa';

  INSERT INTO sesion_estudio (id_usuario, id_materia, nombre, duracion, fecha_programada, id_deck)
  VALUES (sofi, m_analisis, 'Integrales para el parcial', 90, (hoy + 1) + time '18:00', mazo_analisis) RETURNING id_sesion_estudio INTO ses;
  INSERT INTO sesion_estudio_metodo_estudio (id_sesion_estudio, id_tipo_metodo_estudio) VALUES (ses, t_flash), (ses, t_rep), (ses, t_mapa);
  INSERT INTO objetivo_sesion (id_sesion_estudio, descripcion, orden) VALUES
    (ses, 'Repasar las integrales inmediatas', 0), (ses, 'Hacer 5 ejercicios de la guía', 1);
  INSERT INTO pestana_sesion (id_sesion_estudio, titulo, orden) VALUES (ses, 'Pestaña 1', 0);

  INSERT INTO sesion_estudio (id_usuario, id_materia, nombre, duracion, fecha_programada)
  VALUES (sofi, m_ingles, 'Vocabulario técnico', 45, (hoy + 3) + time '10:00') RETURNING id_sesion_estudio INTO ses;
  INSERT INTO sesion_estudio_metodo_estudio (id_sesion_estudio, id_tipo_metodo_estudio) VALUES (ses, t_prac);
  INSERT INTO pestana_sesion (id_sesion_estudio, titulo, orden) VALUES (ses, 'Pestaña 1', 0);

  INSERT INTO sesion_estudio (id_usuario, id_materia, nombre, duracion, fecha_programada)
  VALUES (sofi, m_fisica, 'Repaso de Física', 60, hoy + time '20:00') RETURNING id_sesion_estudio INTO ses;
  INSERT INTO sesion_estudio_metodo_estudio (id_sesion_estudio, id_tipo_metodo_estudio) VALUES (ses, t_rep), (ses, t_flash), (ses, t_mapa), (ses, t_prac);
  INSERT INTO pestana_sesion (id_sesion_estudio, titulo, orden) VALUES (ses, 'Pestaña 1', 0);

  -- Eventos personales
  INSERT INTO eventos (usuario_id, titulo, fecha, categoria, prioridad, lugar) VALUES
    (sofi, 'Parcial de Análisis', (hoy + 5) + time '08:00', 'Parciales', 'importante', 'Aula 204'),
    (sofi, 'Entrega TP Física', (hoy + 2) + time '23:59', 'Entregas', 'media', NULL),
    (sofi, 'Clase de consulta BD', (hoy - 3) + time '10:00', 'Clases', 'leve', 'Laboratorio 3'),
    (sofi, 'Recuperatorio de Física', (hoy + 20) + time '14:00', 'Exámenes', 'importante', NULL),
    (sofi, 'Entrega del resumen de Inglés', (hoy - 8) + time '12:00', 'Entregas', 'leve', NULL);

  -- Metas personales del mes (una vencida y sin cumplir, para ver el aviso)
  INSERT INTO metas (titulo, mes, fecha_limite, completada, fecha_completada, completada_por, orden, creada_por) VALUES
    ('Terminar la guía 3 de Análisis', mes, hoy - 2, FALSE, NULL, NULL, 0, sofi),
    ('Estudiar 10 horas para Física', mes, NULL, TRUE, now(), sofi, 1, sofi),
    ('Pasar en limpio los apuntes de BD', mes, hoy + 6, FALSE, NULL, NULL, 2, sofi);

  -- Proyecto 1: Trabajo final Seminario (propietaria Caro, Sofi y Alba editoras)
  INSERT INTO nodos (nombre, fecha_carga, ultima_fecha_acceso, ultima_fecha_modificacion, "tamaño", id_padre)
  VALUES ('Trabajo final Seminario', now(), now(), now(), 0, 2) RETURNING id_nodo INTO nodo;
  INSERT INTO proyectos (nombre, fecha_creacion, fecha_fin, id_nodo_raiz)
  VALUES ('Trabajo final Seminario', hoy - 120, hoy + 16, nodo) RETURNING id_proyecto INTO p_sem;
  INSERT INTO proyecto_miembros (id_proyecto, id_usuario, rol, fecha_union) VALUES
    (p_sem, caro, 'propietario', hoy - 120), (p_sem, sofi, 'editor', hoy - 119), (p_sem, alba, 'editor', hoy - 118);

  INSERT INTO tareas (id_proyecto, titulo, prioridad, fecha_inicio, fecha_limite, id_asignado, completada,
                      fecha_completada, completada_por, orden, creada_por, fecha_creacion) VALUES
    (p_sem, 'Relevar requisitos', 'alta', hoy - 18, hoy - 12, sofi, TRUE, now() - interval '12 days', sofi, 0, caro, hoy - 20),
    (p_sem, 'Armar presentación', 'media', hoy - 4, hoy + 2, sofi, FALSE, NULL, NULL, 1, caro, hoy - 10),
    (p_sem, 'Escribir el informe final', 'alta', hoy + 1, hoy + 14, sofi, FALSE, NULL, NULL, 2, caro, hoy - 5),
    (p_sem, 'Revisar SQL', 'media', hoy - 9, hoy + 3, caro, TRUE, now() - interval '1 day', caro, 0, caro, hoy - 12),
    (p_sem, 'Diagrama de clases', 'alta', hoy - 14, hoy - 1, caro, FALSE, NULL, NULL, 1, caro, hoy - 15),
    (p_sem, 'Prototipo de pantallas', 'media', hoy - 7, hoy + 5, alba, FALSE, NULL, NULL, 0, caro, hoy - 8),
    (p_sem, 'Pruebas de integración', 'baja', hoy + 6, hoy + 13, alba, FALSE, NULL, NULL, 1, caro, hoy - 3),
    (p_sem, 'Diseñar portada', 'baja', hoy + 5, hoy + 11, NULL, FALSE, NULL, NULL, 0, sofi, hoy - 2),
    -- Tareas terminadas en meses anteriores (para el gráfico de tareas completadas por mes).
    (p_sem, 'Elegir el tema', 'alta', hoy - 115, hoy - 105, caro, TRUE, now() - interval '104 days', caro, 2, caro, hoy - 118),
    (p_sem, 'Buscar bibliografía', 'media', hoy - 100, hoy - 88, sofi, TRUE, now() - interval '90 days', sofi, 3, caro, hoy - 110),
    (p_sem, 'Armar el cronograma', 'media', hoy - 95, hoy - 80, alba, TRUE, now() - interval '78 days', alba, 2, caro, hoy - 100),
    (p_sem, 'Entrevistas a usuarios', 'alta', hoy - 75, hoy - 60, sofi, TRUE, now() - interval '61 days', sofi, 4, caro, hoy - 80),
    (p_sem, 'Casos de uso', 'alta', hoy - 70, hoy - 50, caro, TRUE, now() - interval '52 days', caro, 3, caro, hoy - 72),
    (p_sem, 'Modelo de datos', 'alta', hoy - 55, hoy - 40, alba, TRUE, now() - interval '41 days', alba, 3, caro, hoy - 60),
    (p_sem, 'Maqueta de pantallas', 'media', hoy - 45, hoy - 30, sofi, TRUE, now() - interval '33 days', sofi, 5, caro, hoy - 50);

  INSERT INTO metas (id_proyecto, titulo, mes, fecha_limite, completada, fecha_completada, completada_por, orden, creada_por) VALUES
    (p_sem, 'Cerrar el alcance', mes, hoy - 5, TRUE, now() - interval '5 days', caro, 0, caro),
    (p_sem, 'Primera versión del informe', mes, hoy + 7, FALSE, NULL, NULL, 1, caro),
    (p_sem, 'Demo funcionando', mes, NULL, FALSE, NULL, NULL, 2, sofi);

  INSERT INTO eventos (usuario_id, id_proyecto, titulo, fecha, categoria, prioridad) VALUES
    (caro, p_sem, 'Entrega de avance', (hoy + 2) + time '18:00', 'Entregas', 'importante'),
    (caro, p_sem, 'Reunión con el profe', (hoy + 8) + time '19:00', 'Otro', 'media');

  -- Proyecto 2: Base de Datos TP2 (propietaria Alba, Sofi editora)
  INSERT INTO nodos (nombre, fecha_carga, ultima_fecha_acceso, ultima_fecha_modificacion, "tamaño", id_padre)
  VALUES ('Base de Datos TP2', now(), now(), now(), 0, 2) RETURNING id_nodo INTO nodo;
  INSERT INTO proyectos (nombre, fecha_creacion, fecha_fin, id_nodo_raiz)
  VALUES ('Base de Datos TP2', hoy - 10, hoy + 25, nodo) RETURNING id_proyecto INTO p_bd;
  INSERT INTO proyecto_miembros (id_proyecto, id_usuario, rol, fecha_union) VALUES
    (p_bd, alba, 'propietario', hoy - 10), (p_bd, sofi, 'editor', hoy - 9);

  INSERT INTO tareas (id_proyecto, titulo, prioridad, fecha_inicio, fecha_limite, id_asignado, completada,
                      fecha_completada, completada_por, orden, creada_por, fecha_creacion) VALUES
    (p_bd, 'Modelo entidad-relación', 'alta', hoy - 8, hoy - 3, alba, TRUE, now() - interval '3 days', alba, 0, alba, hoy - 10),
    (p_bd, 'Normalizar tablas', 'media', hoy - 2, hoy + 4, sofi, FALSE, NULL, NULL, 0, alba, hoy - 6),
    (p_bd, 'Consultas del enunciado', 'media', hoy + 3, hoy + 12, alba, FALSE, NULL, NULL, 1, alba, hoy - 4);

  INSERT INTO metas (id_proyecto, titulo, mes, completada, orden, creada_por) VALUES
    (p_bd, 'Tener el DER aprobado', mes, FALSE, 0, alba);

  -- Material: una carpeta con subcarpetas y archivos de varios tipos.
  -- Son solo registros para ver las estadísticas: los archivos no existen en el disco.
  INSERT INTO nodos (nombre, fecha_carga, ultima_fecha_acceso, ultima_fecha_modificacion, "tamaño", id_padre)
  VALUES ('Material de demo', now(), now(), now(), 0, 1) RETURNING id_nodo INTO carpeta;

  FOR i IN 1..4 LOOP
    INSERT INTO nodos (nombre, fecha_carga, ultima_fecha_acceso, ultima_fecha_modificacion, "tamaño", id_padre)
    VALUES ((ARRAY['Análisis', 'Física', 'Seminario', 'Base de Datos'])[i], now(), now(), now(), 0, carpeta)
    RETURNING id_nodo INTO sub;

    INSERT INTO archivos (nombre, extension, ruta_fisica, fecha_carga, "tamaño", id_padre)
    SELECT format('Apunte %s', n),
           (ARRAY['pdf', 'pdf', 'pdf', 'docx', 'docx', 'pptx', 'png', 'xlsx', 'txt'])[1 + (n + i) % 9],
           format('demo/%s/apunte-%s', i, n),
           now() - make_interval(days => (n * 7 + i * 3) % 90),
           150000 + n * 37000 + i * 91000,
           sub
      FROM generate_series(1, 9) n;
  END LOOP;

  -- Material para releer hoy (repetición espaciada)
  INSERT INTO repeticiones_material (id_usuario, id_nodo, intervalo_dias, proxima_revision)
  SELECT sofi, n.id_nodo, CASE n.nombre WHEN 'Análisis' THEN 3 ELSE 7 END, CASE n.nombre WHEN 'Análisis' THEN hoy ELSE hoy + 4 END
    FROM nodos n WHERE n.id_padre = carpeta AND n.nombre IN ('Análisis', 'Física');

  RAISE NOTICE 'Listo: entrá con sofi@syntra.demo / demo1234';
END $demo$;

COMMIT;
