import { Usuario } from "./Usuario";

export function materializarUsuario(fila: any): Usuario {
    return {
        id: fila.id,
        nombre: fila.nombre,
        apellido: fila.apellido,
        apodo: fila.apodo,
        email: fila.email,
        fechaNacimiento: fila.fecha_nacimiento,
        passwordHash: fila.password_hash,
        emailVerificado: fila.email_verificado,
        embeddingFacial: fila.embedding_facial,
        fechaCreacion: fila.fecha_creacion,
    }
}