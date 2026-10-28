-- Imagen de portada de cada proyecto en la tarjeta del listado.
-- Es local de cada compu (no se sincroniza): cada integrante elige la suya.
-- Sin fila, la tarjeta usa los colores de la paleta.
CREATE TABLE IF NOT EXISTS portadas_proyecto (
    id_proyecto INT PRIMARY KEY REFERENCES proyectos(id_proyecto) ON DELETE CASCADE,
    ruta TEXT NOT NULL
);