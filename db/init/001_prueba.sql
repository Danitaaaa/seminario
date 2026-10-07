CREATE TABLE IF NOT EXISTS saludos (
    id SERIAL PRIMARY KEY,
    mensaje TEXT NOT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO saludos (mensaje) VALUES ('Hola desde postgres');