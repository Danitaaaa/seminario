CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    apodo VARCHAR(100) NOT NULL,

    email VARCHAR(255) UNIQUE NOT NULL,

    fecha_nacimiento DATE,

    password_hash TEXT NOT NULL,

    email_verificado BOOLEAN DEFAULT FALSE,

    embedding_facial TEXT,

    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE usuarios
ADD COLUMN codigo_verificacion VARCHAR(6);

ALTER TABLE usuarios
ADD COLUMN fecha_expiracion_codigo TIMESTAMP;