// Consulta base que arma la sesión completa (materia, métodos y objetivos) en una sola pasada.
// Quien la use agrega su propio WHERE y ORDER BY al final.
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
         ), '[]'::json) AS objetivos
    FROM sesion_estudio s
    JOIN materia m ON m.id_materia = s.id_materia
`;
