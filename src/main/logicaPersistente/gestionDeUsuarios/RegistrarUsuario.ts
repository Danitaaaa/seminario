import bycript from 'bcrypt';
import { Usuario } from './Usuario'
import { Persistencia } from '../../persistencia/Persistencia';
import { RegistrarUsuarioDto } from './RegistrarUsuario.dto';
import { materializarUsuario } from './MaterializadorUsuarios';

export class RegistrarUsuario {
    constructor(
        private readonly persistencia: Persistencia
    ) {}

    async ejecutar(
        datos: RegistrarUsuarioDto
    ): Promise<Usuario>{

        const existe = await this.persistencia.ejecutar(
            `SELECT id
            FROM usuarios
            WHERE email = $1
            `,
            [datos.email]
        );

        if (existe.length > 0) {
            throw new Error(
                "El email ya está registrado."
            )
        }

        const passwordHash = await bycript.hash(datos.password,10);

        const codigoVerificar = Math.floor(100000 + Math.random() * 900000).toString();
        
        const fechaExpiracionCodigo = new Date(Date.now() + 10 * 60 * 1000);

        const filas = await this.persistencia.ejecutar(
            `
            INSERT INTO usuarios (
                nombre,
                apellido,
                apodo,
                email,
                fecha_nacimiento,
                password_hash,
                email_verificado,
                codigo_verificacion,
                fecha_expiracion_codigo,
            )
            VALUES ($1, $2, $3, $4, $5, $6, false, $7, $8)
            RETURNING
                id,
                nombre,
                apellido,
                apodo,
                email,
                fecha_nacimiento,
                password_hash,
                email_verificado,
                embedding_facial,
                fecha_creacion
            `,
            [
                datos.nombre,
                datos.apellido,
                datos.apodo,
                datos.email,
                datos.fechaNacimiento,
                passwordHash,
                codigoVerificar,
                fechaExpiracionCodigo
            ]
        );

        return materializarUsuario(filas[0]);

    }
}