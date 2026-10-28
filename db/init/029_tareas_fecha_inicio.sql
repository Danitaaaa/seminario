-- Día en que se empieza una tarea (opcional). Con la fecha límite arma la barra del cronograma de proyectos.
-- Si no se carga, el cronograma usa el día en que se creó la tarea.
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS fecha_inicio DATE NULL;
