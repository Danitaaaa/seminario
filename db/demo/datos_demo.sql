-- Datos de prueba para Syntra: un usuario con sesiones, horarios, eventos, metas,
-- dos proyectos con integrantes y tareas, y archivos en Material.
-- Sofi cursa Ingeniería en Sistemas (plan 2023 de la UTN FRVM): empezó hace dos años y medio y
-- hoy está en 3° año. Tiene el historial completo de la carrera para ver cómo se ve Syntra con
-- datos de años: materias aprobadas, regulares, una libre, las que cursa y las que le faltan,
-- sesiones de estudio desde 1° año y carpetas de Material asociadas a cada materia.
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
  f_isi INT; inicio DATE; en_segundo BOOLEAN;
  m_prob INT; m_com INT; m_numerico INT; m_bd INT;
  mat RECORD; d DATE; desde DATE; hasta DATE; paso INT; n INT; carpeta_anio INT;
  ses INT;
  nodo INT; p_sem INT; p_bd INT;
  carpeta INT; sub INT;
  mazo_analisis INT; mazo_fisica INT;
  mazo_prob INT; mazo_redes INT; cuest_prob INT; cuest_redes INT; cuest_bd INT; conv INT;
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

  -- Formación: empezó en marzo de hace dos años (o tres, si todavía no llegó marzo) y hoy cursa 3° año.
  inicio := make_date(extract(year FROM hoy)::int - 2 - CASE WHEN extract(month FROM hoy) < 3 THEN 1 ELSE 0 END, 3, 1);
  en_segundo := extract(month FROM hoy) >= 8;
  INSERT INTO formacion (id_usuario, tipo, nombre, institucion, duracion_anios, organizacion, anio_actual, cuatrimestre_actual, fecha_creacion)
  VALUES (sofi, 'grado', 'Ingeniería en Sistemas de Información', 'UTN · Facultad Regional Villa María', 5, 'cuatrimestral', 3,
          CASE WHEN en_segundo THEN 'segundo' ELSE 'primero' END, inicio)
  RETURNING id_formacion INTO f_isi;

  -- Plan completo. El estado de 1° y 2° es el de su historia; el de 3° depende del cuatrimestre actual.
  INSERT INTO materia (id_formacion, nombre, anio, cuatrimestre, estado)
  SELECT f_isi, v.nombre, v.anio, v.cuatri,
         CASE WHEN v.anio < 3 THEN v.estado
              WHEN v.anio > 3 THEN 'no_cursada'
              WHEN v.cuatri = 'primero' AND en_segundo THEN v.estado
              WHEN v.cuatri = 'segundo' AND NOT en_segundo THEN 'no_cursada'
              ELSE 'cursando' END
    FROM (VALUES
      ('Análisis Matemático I', 1, 'primero', 'aprobada'),
      ('Álgebra y Geometría Analítica', 1, 'primero', 'aprobada'),
      ('Física I', 1, 'segundo', 'aprobada'),
      ('Inglés I', 1, 'anual', 'aprobada'),
      ('Lógica y Estructuras Discretas', 1, 'segundo', 'aprobada'),
      ('Algoritmos y Estructuras de Datos', 1, 'anual', 'aprobada'),
      ('Arquitectura de Computadoras', 1, 'segundo', 'regular'),
      ('Sistemas y Procesos de Negocios', 1, 'anual', 'aprobada'),
      ('Análisis Matemático II', 2, 'primero', 'aprobada'),
      ('Física II', 2, 'segundo', 'libre'),
      ('Ingeniería y Sociedad', 2, 'primero', 'aprobada'),
      ('Inglés II', 2, 'anual', 'aprobada'),
      ('Sintaxis y Semántica de los Lenguajes', 2, 'segundo', 'regular'),
      ('Paradigmas de Programación', 2, 'segundo', 'aprobada'),
      ('Sistemas Operativos', 2, 'primero', 'aprobada'),
      ('Análisis de Sistemas de Información', 2, 'anual', 'aprobada'),
      ('Probabilidad y Estadística', 3, 'segundo', NULL),
      ('Economía', 3, 'primero', 'aprobada'),
      ('Bases de Datos', 3, 'primero', 'regular'),
      ('Desarrollo de Software', 3, 'primero', 'regular'),
      ('Comunicaciones de Datos', 3, 'segundo', NULL),
      ('Análisis Numérico', 3, 'primero', 'regular'),
      ('Diseño de Sistemas de Información', 3, 'anual', NULL),
      ('Paquete de Materias Electivas 3er nivel', 3, 'segundo', NULL),
      ('Legislación', 4, NULL, NULL),
      ('Ingeniería y Calidad de Software', 4, NULL, NULL),
      ('Redes de Datos', 4, NULL, NULL),
      ('Investigación Operativa', 4, NULL, NULL),
      ('Simulación', 4, NULL, NULL),
      ('Tecnologías para la Automatización', 4, NULL, NULL),
      ('Administración de Sistemas de Información', 4, NULL, NULL),
      ('Paquete de Materias Electivas 4to nivel', 4, NULL, NULL),
      ('Habilitación Profesional (Título Intermedio)', 4, NULL, NULL),
      ('Inteligencia Artificial', 5, NULL, NULL),
      ('Ciencia de Datos', 5, NULL, NULL),
      ('Sistemas de Gestión', 5, NULL, NULL),
      ('Gestión Gerencial', 5, NULL, NULL),
      ('Seguridad en los Sistemas de Información', 5, NULL, NULL),
      ('Proyecto Final', 5, NULL, NULL),
      ('Paquete de Materias Electivas 5to nivel', 5, NULL, NULL),
      ('Práctica Profesional Supervisada', 5, NULL, NULL)
    ) AS v(nombre, anio, cuatri, estado);

  SELECT id_materia INTO m_prob FROM materia WHERE id_formacion = f_isi AND nombre = 'Probabilidad y Estadística';
  SELECT id_materia INTO m_com FROM materia WHERE id_formacion = f_isi AND nombre = 'Comunicaciones de Datos';
  SELECT id_materia INTO m_numerico FROM materia WHERE id_formacion = f_isi AND nombre = 'Análisis Numérico';
  SELECT id_materia INTO m_bd FROM materia WHERE id_formacion = f_isi AND nombre = 'Bases de Datos';

  -- Horarios de cursado (dia_semana: 0 domingo … 6 sábado)
  INSERT INTO horarios_cursado (usuario_id, dia_semana, hora_inicio, hora_fin, titulo, tono) VALUES
    (sofi, 1, '08:00', '10:00', 'Probabilidad y Estadística', 0),
    (sofi, 3, '08:00', '10:00', 'Probabilidad y Estadística', 0),
    (sofi, 2, '14:00', '18:00', 'Comunicaciones de Datos', 1),
    (sofi, 4, '18:00', '22:00', 'Diseño de Sistemas de Información', 2),
    (sofi, 5, '10:00', '12:00', 'Diseño de Sistemas de Información', 2),
    (sofi, 5, '13:00', '15:00', 'Electiva de 3er nivel', 4);

  -- Historial de sesiones desde 1° año, de las materias que cursaba en cada momento.
  -- 1er cuatrimestre: marzo a julio; 2do: agosto a noviembre; anuales: todo el año.
  -- Antes de los parciales (mayo, junio, octubre, noviembre) estudia más seguido.
  -- La materia libre (Física II) muestra un cuatrimestre que se cortó a mitad de camino.
  -- Las aprobadas y regulares tienen unas sesiones de repaso antes del final.
  FOR mat IN SELECT * FROM materia WHERE id_formacion = f_isi AND anio <= 3 AND estado <> 'no_cursada' ORDER BY anio, id_materia LOOP
    desde := (inicio + make_interval(years => mat.anio - 1))::date + CASE WHEN mat.cuatrimestre = 'segundo' THEN 153 ELSE 0 END;
    hasta := (inicio + make_interval(years => mat.anio - 1))::date + CASE WHEN mat.cuatrimestre = 'primero' THEN 140 ELSE 270 END;
    IF mat.estado = 'libre' THEN hasta := desde + 55; END IF;
    d := desde + (mat.id_materia % 5);
    i := 0;
    WHILE d < LEAST(hasta, hoy) LOOP
      paso := CASE WHEN extract(month FROM d) IN (5, 6, 10, 11) THEN 3 ELSE 6 END;
      INSERT INTO sesion_estudio (id_usuario, id_materia, nombre, duracion, estado, fecha_programada,
                                  fecha_inicio, fecha_fin, segundos_pausados)
      VALUES (
        sofi, mat.id_materia,
        CASE WHEN paso = 3 THEN 'Preparar el parcial'
             ELSE (ARRAY['Repaso de teoría', 'Guía de ejercicios', 'Resumen de la unidad', 'Práctica'])[1 + i % 4] END,
        60 + (i % 3) * 30,
        CASE WHEN (mat.id_materia + i) % 9 = 4 THEN 'atrasada' ELSE 'completada' END,
        d + time '17:00',
        d + time '17:05',
        -- Algunas se cortan antes de lo planificado.
        d + time '17:05' + make_interval(mins => 60 + (i % 3) * 30 - CASE WHEN (mat.id_materia + i) % 5 = 0 THEN 20 ELSE 0 END),
        CASE WHEN i % 4 = 1 THEN 300 ELSE 0 END
      ) RETURNING id_sesion_estudio INTO ses;

      INSERT INTO objetivo_sesion (id_sesion_estudio, descripcion, completado, orden) VALUES
        (ses, 'Leer la teoría', TRUE, 0),
        (ses, 'Hacer los ejercicios', (mat.id_materia + i) % 3 <> 0, 1);
      d := d + paso;
      i := i + 1;
    END LOOP;

    -- Repaso para el final: en diciembre (o en julio para las del 1er cuatrimestre).
    IF mat.estado IN ('aprobada', 'regular') THEN
      d := CASE WHEN mat.cuatrimestre = 'primero' THEN hasta + 3 ELSE make_date(extract(year FROM hasta)::int, 12, 1) END;
      FOR n IN 0..2 LOOP
        EXIT WHEN d + n * 2 >= hoy;
        INSERT INTO sesion_estudio (id_usuario, id_materia, nombre, duracion, estado, fecha_programada, fecha_inicio, fecha_fin)
        VALUES (sofi, mat.id_materia, 'Preparar el final', 120, 'completada',
                (d + n * 2) + time '10:00', (d + n * 2) + time '10:00', (d + n * 2) + time '12:00');
      END LOOP;
    END IF;
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
  VALUES (sofi, m_numerico, 'Integración numérica para el final', 90, (hoy + 1) + time '18:00', mazo_analisis) RETURNING id_sesion_estudio INTO ses;
  INSERT INTO sesion_estudio_metodo_estudio (id_sesion_estudio, id_tipo_metodo_estudio) VALUES (ses, t_flash), (ses, t_rep), (ses, t_mapa);
  INSERT INTO objetivo_sesion (id_sesion_estudio, descripcion, orden) VALUES
    (ses, 'Repasar regla del trapecio y Simpson', 0), (ses, 'Hacer 5 ejercicios de la guía', 1);
  INSERT INTO pestana_sesion (id_sesion_estudio, titulo, orden) VALUES (ses, 'Pestaña 1', 0);

  INSERT INTO sesion_estudio (id_usuario, id_materia, nombre, duracion, fecha_programada)
  VALUES (sofi, m_com, 'Modelo OSI y TCP/IP', 45, (hoy + 3) + time '10:00') RETURNING id_sesion_estudio INTO ses;
  INSERT INTO sesion_estudio_metodo_estudio (id_sesion_estudio, id_tipo_metodo_estudio) VALUES (ses, t_prac);
  INSERT INTO pestana_sesion (id_sesion_estudio, titulo, orden) VALUES (ses, 'Pestaña 1', 0);

  INSERT INTO sesion_estudio (id_usuario, id_materia, nombre, duracion, fecha_programada)
  VALUES (sofi, m_prob, 'Distribuciones para el parcial', 60, hoy + time '20:00') RETURNING id_sesion_estudio INTO ses;
  INSERT INTO sesion_estudio_metodo_estudio (id_sesion_estudio, id_tipo_metodo_estudio) VALUES (ses, t_rep), (ses, t_flash), (ses, t_mapa), (ses, t_prac);
  INSERT INTO pestana_sesion (id_sesion_estudio, titulo, orden) VALUES (ses, 'Pestaña 1', 0);

  -- Eventos personales
  INSERT INTO eventos (usuario_id, titulo, fecha, categoria, prioridad, lugar) VALUES
    (sofi, 'Parcial de Probabilidad', (hoy + 5) + time '08:00', 'Parciales', 'importante', 'Aula 204'),
    (sofi, 'Entrega TP Comunicaciones', (hoy + 2) + time '23:59', 'Entregas', 'media', NULL),
    (sofi, 'Clase de consulta Diseño', (hoy - 3) + time '10:00', 'Clases', 'leve', 'Laboratorio 3'),
    (sofi, 'Final de Bases de Datos', (hoy + 20) + time '14:00', 'Exámenes', 'importante', NULL),
    (sofi, 'Entrega del resumen de Comunicaciones', (hoy - 8) + time '12:00', 'Entregas', 'leve', NULL);

  -- Metas personales del mes (una vencida y sin cumplir, para ver el aviso)
  INSERT INTO metas (id_usuario, titulo, mes, fecha_limite, completada, fecha_completada, orden) VALUES
    (sofi, 'Terminar la guía 3 de Probabilidad', mes, hoy - 2, FALSE, NULL, 0),
    (sofi, 'Estudiar 10 horas para Comunicaciones', mes, NULL, TRUE, now(), 1),
    (sofi, 'Pasar en limpio los apuntes de BD para el final', mes, hoy + 6, FALSE, NULL, 2);

  -- Proyecto 1: Trabajo final Seminario (propietaria Caro, Sofi y Alba editoras)
  INSERT INTO nodos (nombre, fecha_carga, ultima_fecha_acceso, ultima_fecha_modificacion, "tamaño", id_padre)
  VALUES ('Trabajo final Seminario', now(), now(), now(), 0, 2) RETURNING id_nodo INTO nodo;
  INSERT INTO proyectos (nombre, fecha_creacion, fecha_fin, id_nodo_raiz)
  VALUES ('Trabajo final Seminario', hoy - 120, hoy + 16, nodo) RETURNING id_proyecto INTO p_sem;
  INSERT INTO proyecto_miembros (id_proyecto, id_usuario, rol, fecha_union) VALUES
    (p_sem, caro, 'propietario', hoy - 120), (p_sem, sofi, 'editor', hoy - 119), (p_sem, alba, 'editor', hoy - 118);

  INSERT INTO tareas (id_proyecto, titulo, prioridad, fecha_inicio, fecha_limite, id_asignado, completada,
                      fecha_completada, orden, fecha_creacion) VALUES
    (p_sem, 'Relevar requisitos', 'alta', hoy - 18, hoy - 12, sofi, TRUE, now() - interval '12 days', 0, hoy - 20),
    (p_sem, 'Armar presentación', 'media', hoy - 4, hoy + 2, sofi, FALSE, NULL, 1, hoy - 10),
    (p_sem, 'Escribir el informe final', 'alta', hoy + 1, hoy + 14, sofi, FALSE, NULL, 2, hoy - 5),
    (p_sem, 'Revisar SQL', 'media', hoy - 9, hoy + 3, caro, TRUE, now() - interval '1 day', 0, hoy - 12),
    (p_sem, 'Diagrama de clases', 'alta', hoy - 14, hoy - 1, caro, FALSE, NULL, 1, hoy - 15),
    (p_sem, 'Prototipo de pantallas', 'media', hoy - 7, hoy + 5, alba, FALSE, NULL, 0, hoy - 8),
    (p_sem, 'Pruebas de integración', 'baja', hoy + 6, hoy + 13, alba, FALSE, NULL, 1, hoy - 3),
    (p_sem, 'Diseñar portada', 'baja', hoy + 5, hoy + 11, NULL, FALSE, NULL, 0, hoy - 2),
    -- Tareas terminadas en meses anteriores (para el gráfico de tareas completadas por mes).
    (p_sem, 'Elegir el tema', 'alta', hoy - 115, hoy - 105, caro, TRUE, now() - interval '104 days', 2, hoy - 118),
    (p_sem, 'Buscar bibliografía', 'media', hoy - 100, hoy - 88, sofi, TRUE, now() - interval '90 days', 3, hoy - 110),
    (p_sem, 'Armar el cronograma', 'media', hoy - 95, hoy - 80, alba, TRUE, now() - interval '78 days', 2, hoy - 100),
    (p_sem, 'Entrevistas a usuarios', 'alta', hoy - 75, hoy - 60, sofi, TRUE, now() - interval '61 days', 4, hoy - 80),
    (p_sem, 'Casos de uso', 'alta', hoy - 70, hoy - 50, caro, TRUE, now() - interval '52 days', 3, hoy - 72),
    (p_sem, 'Modelo de datos', 'alta', hoy - 55, hoy - 40, alba, TRUE, now() - interval '41 days', 3, hoy - 60),
    (p_sem, 'Maqueta de pantallas', 'media', hoy - 45, hoy - 30, sofi, TRUE, now() - interval '33 days', 5, hoy - 50);

  INSERT INTO metas (id_proyecto, titulo, mes, fecha_limite, completada, fecha_completada, orden) VALUES
    (p_sem, 'Cerrar el alcance', mes, hoy - 5, TRUE, now() - interval '5 days', 0),
    (p_sem, 'Primera versión del informe', mes, hoy + 7, FALSE, NULL, 1),
    (p_sem, 'Demo funcionando', mes, NULL, FALSE, NULL, 2);

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
                      fecha_completada, orden, fecha_creacion) VALUES
    (p_bd, 'Modelo entidad-relación', 'alta', hoy - 8, hoy - 3, alba, TRUE, now() - interval '3 days', 0, hoy - 10),
    (p_bd, 'Normalizar tablas', 'media', hoy - 2, hoy + 4, sofi, FALSE, NULL, 0, hoy - 6),
    (p_bd, 'Consultas del enunciado', 'media', hoy + 3, hoy + 12, alba, FALSE, NULL, 1, hoy - 4);

  INSERT INTO metas (id_proyecto, titulo, mes, completada, orden) VALUES
    (p_bd, 'Tener el DER aprobado', mes, FALSE, 0);

  -- Material: "Material de demo" / "1° año" / una carpeta por materia (asociada a la materia) / archivos.
  -- Son solo registros para ver las estadísticas: los archivos no existen en el disco.
  INSERT INTO nodos (nombre, fecha_carga, ultima_fecha_acceso, ultima_fecha_modificacion, "tamaño", id_padre)
  VALUES ('Material de demo', inicio, now(), now(), 0, 1) RETURNING id_nodo INTO carpeta;

  FOR carpeta_anio IN 1..3 LOOP
    INSERT INTO nodos (nombre, fecha_carga, ultima_fecha_acceso, ultima_fecha_modificacion, "tamaño", id_padre)
    VALUES (format('%s° año', carpeta_anio), inicio + make_interval(years => carpeta_anio - 1), now(), now(), 0, carpeta)
    RETURNING id_nodo INTO sub;

    FOR mat IN SELECT * FROM materia WHERE id_formacion = f_isi AND anio = carpeta_anio AND estado <> 'no_cursada' ORDER BY id_materia LOOP
      d := (inicio + make_interval(years => carpeta_anio - 1))::date + CASE WHEN mat.cuatrimestre = 'segundo' THEN 153 ELSE 0 END;
      INSERT INTO nodos (nombre, fecha_carga, ultima_fecha_acceso, ultima_fecha_modificacion, "tamaño", id_padre, id_materia)
      VALUES (mat.nombre, d, now(), d, 0, sub, mat.id_materia) RETURNING id_nodo INTO nodo;

      INSERT INTO archivos (nombre, extension, ruta_fisica, fecha_carga, "tamaño", id_padre)
      SELECT format('Apunte %s', k),
             (ARRAY['pdf', 'pdf', 'pdf', 'docx', 'docx', 'pptx', 'png', 'xlsx', 'txt'])[1 + (k + mat.id_materia) % 9],
             format('demo/%s/apunte-%s', mat.id_materia, k),
             LEAST(d + k * 9, hoy),
             150000 + k * 37000 + (mat.id_materia % 7) * 91000,
             nodo
        FROM generate_series(1, 3 + mat.id_materia % 4) k;
    END LOOP;
  END LOOP;

  -- Material para releer (repetición espaciada): lo de las materias que cursa ahora.
  INSERT INTO repeticiones_material (id_usuario, id_nodo, intervalo_dias, proxima_revision)
  SELECT sofi, n.id_nodo, CASE n.id_materia WHEN m_prob THEN 3 ELSE 7 END, CASE n.id_materia WHEN m_prob THEN hoy ELSE hoy + 4 END
    FROM nodos n WHERE n.id_materia IN (m_prob, m_com);


  -- ===== Novedades: avatares, cuadernos, flashcards y cuestionarios con historial, material IA y chat =====

  -- Avatares y colores (los colores se ven en los integrantes de los proyectos).
  UPDATE usuarios SET foto_perfil = 'avatar:buho', color_avatar = 1 WHERE id_usuario = sofi;
  UPDATE usuarios SET foto_perfil = 'avatar:libro', color_avatar = 4 WHERE id_usuario = caro;
  UPDATE usuarios SET color_avatar = 7 WHERE id_usuario = alba;

  -- Mazos asociados a un cuaderno.
  UPDATE decks SET id_materia = m_numerico WHERE id_deck = mazo_analisis;
  INSERT INTO decks (id_usuario, nombre, descripcion, materia_asociada, id_materia)
  VALUES (sofi, 'Probabilidad', 'Distribuciones y variables aleatorias', 'Probabilidad y Estadística', m_prob) RETURNING id_deck INTO mazo_prob;
  INSERT INTO decks (id_usuario, nombre, descripcion, materia_asociada, id_materia)
  VALUES (sofi, 'Redes', 'Modelo OSI, TCP/IP y protocolos', 'Comunicaciones de Datos', m_com) RETURNING id_deck INTO mazo_redes;

  INSERT INTO flashcards (id_deck, pregunta, respuesta, proxima_revision) VALUES
    (mazo_prob, '¿Qué es una variable aleatoria?', 'Una función que asigna un número a cada resultado de un experimento.', hoy),
    (mazo_prob, '¿Cuál es la media de una binomial?', '$E(X) = n\,p$', hoy + 1),
    (mazo_prob, '¿Cuál es la varianza de una binomial?', '$V(X) = n\,p\,(1-p)$', hoy + 2),
    (mazo_prob, '¿Qué dice el teorema central del límite?', 'La suma de muchas variables independientes tiende a una distribución normal.', hoy),
    (mazo_prob, '¿Cómo se estandariza una normal?', '$Z = \frac{X - \mu}{\sigma}$', hoy + 4),
    (mazo_prob, '¿Qué es la probabilidad condicional?', '$P(A \mid B) = \frac{P(A \cap B)}{P(B)}$', hoy + 3),
    (mazo_redes, '¿Cuántas capas tiene el modelo OSI?', 'Siete: física, enlace, red, transporte, sesión, presentación y aplicación.', hoy),
    (mazo_redes, '¿En qué capa trabaja un router?', 'En la capa de red (capa 3).', hoy + 2),
    (mazo_redes, '¿Qué diferencia hay entre TCP y UDP?', 'TCP es orientado a conexión y confiable; UDP no garantiza la entrega pero es más rápido.', hoy + 1),
    (mazo_redes, '¿Para qué sirve DNS?', 'Traduce nombres de dominio a direcciones IP.', hoy + 5),
    (mazo_redes, '¿Qué es una máscara de subred?', 'Indica qué parte de la dirección IP es la red y cuál el host.', hoy);

  -- Repasos de los últimos 6 meses: al principio más difíciles, cada vez más fáciles.
  INSERT INTO flashcard_revisiones (id_flashcard, dificultad, revisado_en, proxima_revision)
  SELECT f.id_flashcard,
         CASE WHEN (f.id_flashcard + g) % 10 < (CASE WHEN g > 120 THEN 2 WHEN g > 60 THEN 4 ELSE 6 END) THEN 'facil'
              WHEN (f.id_flashcard + g) % 10 < 8 THEN 'intermedio' ELSE 'dificil' END,
         (hoy - g) + time '18:30' + make_interval(mins => (f.id_flashcard % 7) * 3),
         hoy - g + 3
    FROM flashcards f
   CROSS JOIN generate_series(1, 180, 4) g
   WHERE f.id_deck IN (mazo_analisis, mazo_fisica, mazo_prob, mazo_redes)
     AND (f.id_flashcard + g) % 3 <> 0
     -- Las de Probabilidad y Redes se empezaron a estudiar este cuatrimestre.
     AND (f.id_deck IN (mazo_analisis, mazo_fisica) OR g < 100);

  -- Cuestionarios generados con IA (asociados a su cuaderno).
  INSERT INTO materiales_ia (id_usuario, tipo, titulo, contenido, proveedores, fecha_creacion, id_materia)
  VALUES (sofi, 'cuestionario', 'Distribuciones de probabilidad', $j${
    "titulo": "Distribuciones de probabilidad",
    "preguntas": [
      {"tipo": "opcion_multiple", "enunciado": "¿Qué distribución modela la cantidad de éxitos en n ensayos independientes?", "opciones": ["Binomial", "Poisson", "Normal", "Exponencial"], "indiceCorrecta": 0, "respuesta": null, "explicacion": "La binomial cuenta éxitos en n ensayos con la misma probabilidad p.", "tema": "Binomial"},
      {"tipo": "opcion_multiple", "enunciado": "¿Cuál es la media de una Poisson con parámetro λ?", "opciones": ["λ²", "λ", "1/λ", "√λ"], "indiceCorrecta": 1, "respuesta": null, "explicacion": "En la Poisson la media y la varianza valen λ.", "tema": "Poisson"},
      {"tipo": "completar_seleccion", "enunciado": "La distribución normal estándar tiene media 0 y desvío ___.", "opciones": ["1", "0", "10"], "indiceCorrecta": 0, "respuesta": null, "explicacion": "La normal estándar es N(0, 1).", "tema": "Normal"},
      {"tipo": "completar_escrito", "enunciado": "Para estandarizar se resta la media y se divide por el ___.", "opciones": [], "indiceCorrecta": null, "respuesta": "desvío", "explicacion": "Z = (X − μ) / σ.", "tema": "Normal"},
      {"tipo": "opcion_multiple", "enunciado": "¿Qué distribución modela el tiempo entre llegadas de un proceso de Poisson?", "opciones": ["Uniforme", "Binomial", "Exponencial", "Normal"], "indiceCorrecta": 2, "respuesta": null, "explicacion": "Los tiempos entre eventos de un proceso de Poisson son exponenciales.", "tema": "Exponencial"}
    ]}$j$::jsonb, ARRAY['gptMini'], now() - interval '75 days', m_prob) RETURNING id_material_ia INTO cuest_prob;

  INSERT INTO materiales_ia (id_usuario, tipo, titulo, contenido, proveedores, fecha_creacion, id_materia)
  VALUES (sofi, 'cuestionario', 'Modelo OSI y TCP/IP', $j${
    "titulo": "Modelo OSI y TCP/IP",
    "preguntas": [
      {"tipo": "opcion_multiple", "enunciado": "¿En qué capa del modelo OSI trabaja un switch?", "opciones": ["Física", "Enlace", "Red", "Transporte"], "indiceCorrecta": 1, "respuesta": null, "explicacion": "El switch usa direcciones MAC: capa de enlace.", "tema": "Modelo OSI"},
      {"tipo": "opcion_multiple", "enunciado": "¿Qué protocolo garantiza la entrega ordenada de los datos?", "opciones": ["UDP", "IP", "TCP", "ICMP"], "indiceCorrecta": 2, "respuesta": null, "explicacion": "TCP es orientado a conexión y confiable.", "tema": "Capa de transporte"},
      {"tipo": "completar_seleccion", "enunciado": "HTTP usa por defecto el puerto ___.", "opciones": ["21", "80", "443"], "indiceCorrecta": 1, "respuesta": null, "explicacion": "HTTP usa el 80 y HTTPS el 443.", "tema": "Capa de aplicación"},
      {"tipo": "opcion_multiple", "enunciado": "¿Cuántos bits tiene una dirección IPv4?", "opciones": ["16", "32", "64", "128"], "indiceCorrecta": 1, "respuesta": null, "explicacion": "IPv4 usa 32 bits; IPv6, 128.", "tema": "Direccionamiento IP"},
      {"tipo": "completar_escrito", "enunciado": "El protocolo que traduce nombres de dominio a direcciones IP es ___.", "opciones": [], "indiceCorrecta": null, "respuesta": "DNS", "explicacion": "DNS resuelve nombres a direcciones.", "tema": "Capa de aplicación"},
      {"tipo": "opcion_multiple", "enunciado": "¿Qué máscara corresponde a /24?", "opciones": ["255.0.0.0", "255.255.0.0", "255.255.255.0", "255.255.255.255"], "indiceCorrecta": 2, "respuesta": null, "explicacion": "24 bits en 1: 255.255.255.0.", "tema": "Direccionamiento IP"}
    ]}$j$::jsonb, ARRAY['gptMini'], now() - interval '50 days', m_com) RETURNING id_material_ia INTO cuest_redes;

  INSERT INTO materiales_ia (id_usuario, tipo, titulo, contenido, proveedores, fecha_creacion, id_materia)
  VALUES (sofi, 'cuestionario', 'Normalización y SQL', $j${
    "titulo": "Normalización y SQL",
    "preguntas": [
      {"tipo": "opcion_multiple", "enunciado": "¿Qué forma normal elimina las dependencias parciales?", "opciones": ["1FN", "2FN", "3FN", "FNBC"], "indiceCorrecta": 1, "respuesta": null, "explicacion": "La 2FN exige que los atributos dependan de toda la clave.", "tema": "Normalización"},
      {"tipo": "opcion_multiple", "enunciado": "¿Qué cláusula filtra después de agrupar?", "opciones": ["WHERE", "HAVING", "ORDER BY", "LIMIT"], "indiceCorrecta": 1, "respuesta": null, "explicacion": "HAVING filtra grupos; WHERE filtra filas.", "tema": "SQL"},
      {"tipo": "completar_seleccion", "enunciado": "Un ___ JOIN devuelve también las filas de la izquierda sin coincidencia.", "opciones": ["INNER", "LEFT", "CROSS"], "indiceCorrecta": 1, "respuesta": null, "explicacion": "LEFT JOIN conserva todas las filas de la tabla izquierda.", "tema": "SQL"},
      {"tipo": "opcion_multiple", "enunciado": "¿Qué garantiza la propiedad de atomicidad?", "opciones": ["Que la transacción se hace entera o no se hace", "Que los datos no se repiten", "Que se puede leer en paralelo", "Que se guarda en disco"], "indiceCorrecta": 0, "respuesta": null, "explicacion": "Atomicidad: todo o nada.", "tema": "Transacciones"}
    ]}$j$::jsonb, ARRAY['gptMini'], now() - interval '150 days', m_bd) RETURNING id_material_ia INTO cuest_bd;

  -- Intentos: le va cada vez mejor. Las respuestas no se muestran en las estadísticas, quedan vacías.
  FOR n IN 0..11 LOOP
    -- Probabilidad: en los últimos 2 meses y medio.
    IF n * 6 < 75 THEN
      INSERT INTO intentos_cuestionario (id_material_ia, id_usuario, respuestas, correctas, total, temas_a_reforzar, fecha)
      VALUES (cuest_prob, sofi, '[]', LEAST(5, 2 + (11 - n) / 4), 5,
              CASE WHEN n >= 8 THEN '[{"tema":"Poisson","errores":1,"total":1},{"tema":"Normal","errores":2,"total":2}]'
                   WHEN n >= 4 THEN '[{"tema":"Normal","errores":1,"total":2},{"tema":"Exponencial","errores":1,"total":1}]'
                   ELSE '[{"tema":"Exponencial","errores":1,"total":1}]' END::jsonb,
              now() - make_interval(days => n * 6, hours => 2));
    END IF;
    -- Redes: en los últimos 50 días.
    IF n * 4 < 50 THEN
      INSERT INTO intentos_cuestionario (id_material_ia, id_usuario, respuestas, correctas, total, temas_a_reforzar, fecha)
      VALUES (cuest_redes, sofi, '[]', LEAST(6, 3 + (11 - n) / 4), 6,
              CASE WHEN n >= 6 THEN '[{"tema":"Direccionamiento IP","errores":2,"total":2},{"tema":"Modelo OSI","errores":1,"total":1}]'
                   ELSE '[{"tema":"Direccionamiento IP","errores":1,"total":2}]' END::jsonb,
              now() - make_interval(days => n * 4, hours => 5));
    END IF;
    -- Bases de Datos: entre hace 5 meses y hace 3 (antes del parcial).
    IF n < 6 THEN
      INSERT INTO intentos_cuestionario (id_material_ia, id_usuario, respuestas, correctas, total, temas_a_reforzar, fecha)
      VALUES (cuest_bd, sofi, '[]', LEAST(4, 1 + n / 2), 4,
              CASE WHEN n < 3 THEN '[{"tema":"Normalización","errores":1,"total":1},{"tema":"SQL","errores":1,"total":2}]'
                   ELSE '[{"tema":"Transacciones","errores":1,"total":1}]' END::jsonb,
              now() - make_interval(days => 150 - n * 10));
    END IF;
  END LOOP;

  -- Un resumen y un mapa mental, también en sus cuadernos.
  INSERT INTO materiales_ia (id_usuario, tipo, titulo, contenido, proveedores, fecha_creacion, id_materia)
  VALUES (sofi, 'resumen', 'Resumen: capa de transporte', $j${
    "titulo": "Resumen: capa de transporte",
    "ideasClave": ["TCP es confiable y orientado a conexión", "UDP es rápido y sin conexión", "Los puertos identifican a cada aplicación"],
    "secciones": [
      {"titulo": "TCP", "contenido": "Establece la conexión con el saludo de tres vías, numera los segmentos y retransmite los que se pierden."},
      {"titulo": "UDP", "contenido": "Manda datagramas sin confirmar la entrega. Se usa en video, voz y DNS."},
      {"titulo": "Puertos", "contenido": "Un número de 16 bits que indica a qué proceso va cada segmento."}
    ]}$j$::jsonb, ARRAY['gptMini'], now() - interval '20 days', m_com);

  INSERT INTO materiales_ia (id_usuario, tipo, titulo, contenido, proveedores, fecha_creacion, id_materia)
  VALUES (sofi, 'mapaMental', 'Variables aleatorias', $j${
    "titulo": "Variables aleatorias",
    "nodos": [
      {"id": "n1", "texto": "Variables aleatorias", "padreId": null},
      {"id": "n2", "texto": "Discretas", "padreId": "n1"},
      {"id": "n3", "texto": "Continuas", "padreId": "n1"},
      {"id": "n4", "texto": "Binomial", "padreId": "n2"},
      {"id": "n5", "texto": "Poisson", "padreId": "n2"},
      {"id": "n6", "texto": "Normal", "padreId": "n3"},
      {"id": "n7", "texto": "Exponencial", "padreId": "n3"},
      {"id": "n8", "texto": "Media y varianza", "padreId": "n1"}
    ]}$j$::jsonb, ARRAY['gptMini'], now() - interval '30 days', m_prob);

  -- Cuadernos con notas.
  INSERT INTO cuaderno (id_usuario, id_materia, nombre) VALUES
    (sofi, m_prob, 'Probabilidad y Estadística'), (sofi, m_com, 'Comunicaciones de Datos'),
    (sofi, m_bd, 'Bases de Datos'), (sofi, m_numerico, 'Análisis Numérico')
  ON CONFLICT (id_materia) DO NOTHING;

  INSERT INTO nota (id_cuaderno, tipo, nombre, fecha, nota, estado)
  SELECT c.id_cuaderno, v.tipo, v.nombre, hoy + v.dias, v.nota, v.estado
    FROM cuaderno c
    JOIN (VALUES
      (m_bd, 'parcial', 'Primer parcial', -200, 7.00, 'aprobado'),
      (m_bd, 'parcial', 'Segundo parcial', -150, 8.00, 'aprobado'),
      (m_bd, 'tp', 'TP integrador', -140, 9.00, 'aprobado'),
      (m_bd, 'final', 'Final', 20, NULL, 'pendiente'),
      (m_numerico, 'parcial', 'Primer parcial', -190, 5.00, 'desaprobado'),
      (m_numerico, 'recuperatorio', 'Recuperatorio primer parcial', -175, 7.00, 'aprobado'),
      (m_numerico, 'parcial', 'Segundo parcial', -145, 6.50, 'aprobado'),
      (m_prob, 'parcial', 'Primer parcial', -30, 8.00, 'aprobado'),
      (m_prob, 'tp', 'TP de simulación', -12, 9.50, 'aprobado'),
      (m_prob, 'parcial', 'Segundo parcial', 5, NULL, 'pendiente'),
      (m_com, 'tp', 'TP de subredes', -25, 9.00, 'aprobado'),
      (m_com, 'parcial', 'Primer parcial', -18, 6.00, 'aprobado'),
      (m_com, 'parcial', 'Segundo parcial', 14, NULL, 'pendiente')
    ) AS v(id_materia, tipo, nombre, dias, nota, estado) ON v.id_materia = c.id_materia
   WHERE c.id_usuario = sofi;

  -- Un día cargado hoy (4 sesiones): dispara el aviso de bienestar.
  FOR n IN 0..2 LOOP
    INSERT INTO sesion_estudio (id_usuario, id_materia, nombre, duracion, estado, fecha_programada, fecha_inicio, fecha_fin)
    VALUES (sofi, (ARRAY[m_prob, m_com, m_bd])[n + 1], (ARRAY['Ejercicios de distribuciones', 'Subredes', 'Repaso para el final'])[n + 1],
            90, 'completada', hoy + time '09:00' + make_interval(hours => n * 2),
            hoy + time '09:00' + make_interval(hours => n * 2), hoy + time '10:30' + make_interval(hours => n * 2));
  END LOOP;

  -- Una conversación con la IA.
  INSERT INTO conversaciones_ia (id_usuario, titulo, fecha_creacion, fecha_actualizacion)
  VALUES (sofi, 'Diferencia entre binomial y Poisson', now() - interval '2 days', now() - interval '2 days') RETURNING id_conversacion INTO conv;
  INSERT INTO mensajes_ia (id_conversacion, rol, texto, proveedor, fecha) VALUES
    (conv, 'usuario', '¿Cuándo uso una binomial y cuándo una Poisson?', NULL, now() - interval '2 days'),
    (conv, 'ia', 'Usá la **binomial** cuando tenés una cantidad fija de ensayos (n) y en cada uno hay éxito o fracaso con la misma probabilidad p. Usá la **Poisson** cuando contás eventos en un intervalo de tiempo o espacio y no hay un número fijo de ensayos, por ejemplo, llamadas por hora. Si n es grande y p chica, la binomial se aproxima con una Poisson de λ = n·p.', 'gptMini', now() - interval '2 days' + interval '20 seconds'),
    (conv, 'usuario', 'Dame un ejemplo de cada una', NULL, now() - interval '2 days' + interval '2 minutes'),
    (conv, 'ia', '**Binomial:** de 10 preguntas de opción múltiple con 4 opciones, ¿cuál es la probabilidad de acertar 3 respondiendo al azar? (n = 10, p = 0,25).

**Poisson:** a una mesa de ayuda llegan en promedio 4 consultas por hora. ¿Cuál es la probabilidad de que lleguen 6 en la próxima hora? (λ = 4).', 'gptMini', now() - interval '2 days' + interval '2 minutes 15 seconds');

  RAISE NOTICE 'Listo: entrá con sofi@syntra.demo / demo1234';
END $demo$;

COMMIT;
