import bcrypt from 'bcrypt';
import { IniciarSesionDto } from './dto/IniciarSesion.dto';
import { Usuario } from './Usuario';
import { Persistencia } from '../../persistencia/Persistencia';
import { materializarUsuario } from './MaterializadorUsuarios';

export class IniciarSesion {
    constructor(
        private readonly persistencia: Persistencia
    ) {}

    async ejecutar(
        datos: IniciarSesionDto
    ): Promise<Usuario> {

        const filas = await this.persistencia.ejecutar(
            `SELECT
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
            FROM usuarios
            WHERE email = $1
            LIMIT 1`,
            [datos.email]
        );

        if (filas.length === 0) {
            throw new Error(
                "El usuario no existe"
            );
        }

        const usuario = materializarUsuario(filas[0]);

        if (!usuario.emailVerificado) {
            throw new Error(
                "El email no está validado"
            );
        }

        const passwordValida = await bcrypt.compare(
            datos.password,
            usuario.passwordHash
        );

        if (!passwordValida) {
            throw new Error('La contraseña es incorrecta');
        }

        return usuario;
    }
}