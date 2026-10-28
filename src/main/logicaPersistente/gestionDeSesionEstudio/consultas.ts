// Consulta base que arma la sesión completa (materia, métodos y metas) en una sola pasada.
// Quien la use agrega su propio WHERE y ORDER BY al final.
// El contenido de las pestañas no viaja acá (puede ser pesado): se pide aparte con GestionarPestanas.
export const SELECT_SESION_ESTUDIO = `
  SELECT s.*,
         m.nombre AS materia_nombre,
         COALESCE((
           SELECT json_agg(
                    json_build_object(
                      'idTipoMetodoEstudio', t.id_tipo_metodo_estudio,
                      'nombre', t.nombre
                    ) ORDER BY t.nombre)
             FROM sesion_estudio_metodo_estudio sm
             JOIN tipo_metodo_estudio t
               ON t.id_tipo_metodo_estudio = sm.id_tipo_metodo_estudio
            WHERE sm.id_sesion_estudio = s.id_sesion_estudio
         ), '[]'::json) AS metodos_estudio,
         COALESCE((
           SELECT json_agg(
                    json_build_object(
                      'idObjetivo', o.id_objetivo,
                      'descripcion', o.descripcion,
                      'completado', o.completado,
                      'orden', o.orden
                    ) ORDER BY o.orden, o.id_objetivo)
             FROM objetivo_sesion o
            WHERE o.id_sesion_estudio = s.id_sesion_estudio
         ), '[]'::json) AS metas
    FROM sesion_estudio s
    JOIN materia m ON m.id_materia = s.id_materia
`;

// Duración en segundos de la fase actual del Pomodoro, según la configuración de la sesión.
export const SEGUNDOS_FASE_POMODORO = `
  (CASE pomodoro_fase
     WHEN 'pomodoro' THEN pomodoro_min
     WHEN 'descanso_corto' THEN descanso_corto_min
     ELSE descanso_largo_min
   END * 60)
`;

// Segundos que le quedan al Pomodoro en este instante (si está corriendo, descuenta lo transcurrido).
export const SEGUNDOS_RESTANTES_POMODORO = `
  GREATEST(0,
    COALESCE(pomodoro_restante_seg, ${SEGUNDOS_FASE_POMODORO})
    - CASE WHEN pomodoro_corriendo_desde IS NULL THEN 0
           ELSE floor(extract(epoch FROM now() - pomodoro_corriendo_desde))::int
      END
  )::int
`;
