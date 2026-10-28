CREATE TABLE IF NOT EXISTS flashcard_revisiones (
    id_revision INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_flashcard INTEGER NOT NULL REFERENCES flashcards(id_flashcard) ON DELETE CASCADE,
    dificultad VARCHAR(20) NOT NULL CHECK (dificultad IN ('dificil', 'intermedio', 'facil')),
    revisado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    proxima_revision DATE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_flashcards_revision
    ON flashcards (proxima_revision);

CREATE TABLE IF NOT EXISTS repeticiones_material (
    id_usuario INTEGER NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    id_nodo INTEGER NOT NULL REFERENCES nodos(id_nodo) ON DELETE CASCADE,
    intervalo_dias INTEGER NOT NULL CHECK (intervalo_dias IN (1, 3, 7, 14)),
    proxima_revision DATE NOT NULL DEFAULT CURRENT_DATE,
    PRIMARY KEY (id_usuario, id_nodo)
);

CREATE TABLE IF NOT EXISTS notificaciones_repaso_enviadas (
    id_usuario INTEGER NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    fecha_envio DATE NOT NULL DEFAULT CURRENT_DATE,
    enviado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_usuario, fecha_envio)
);
