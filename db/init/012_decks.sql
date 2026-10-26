CREATE TABLE IF NOT EXISTS decks (
    id_deck INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_usuario INTEGER NOT NULL,

    nombre VARCHAR(100) NOT NULL,

    descripcion TEXT,

    materia_asociada VARCHAR(100),

    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_deck_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE
);