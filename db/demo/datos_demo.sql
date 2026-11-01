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

  RAISE NOTICE 'Listo: entrá con sofi@syntra.demo / demo1234';
END $demo$;

COMMIT;
