-- La carpeta de Material donde se guardan las guías pasa de "guia" a "Guía de preguntas".
-- Se renombra la que ya existía (en la raíz de Material, id 1) si todavía no hay una con el nombre nuevo.
UPDATE nodos SET nombre = 'Guía de preguntas'
 WHERE id_padre = 1 AND nombre = 'guia'
   AND NOT EXISTS (SELECT 1 FROM nodos WHERE id_padre = 1 AND nombre = 'Guía de preguntas');
