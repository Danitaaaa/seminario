import bycript from 'bcrypt';
import { Persistencia } from '../../persistencia/Persistencia';
import { materializarUsuario } from './MaterializadorUsuarios';
import { CambiarPasswordDto } from './dto/CambiarPassword.dto';

export class CambiarPassword {
    constructor(
        private readonly persistencia: Persistencia
    ) {}

    async ejecutar(
        datos: CambiarPasswordDto
    ): Promise<void> {

        const filas = await this.persistencia.ejecutar(
            `SELECT id, email_verificado
            FROM usuarios
            WHERE email = $1
            `,
            [datos.email]
        );

        if (filas.length === 0) {
            throw new Error(
                "Usuario no encontrado."
            );
        }

        const usuario = materializarUsuario(filas[0]);

        if (!usuario.emailVerificado) {
            throw new Error(
                "El correo no está verificado."
            );
        }

        const passwordHash = await bycript.hash(datos.nuevaPassword, 10);

        await this.persistencia.ejecutar(
            `
            UPDATE usuarios
            SET
                password_hash = $1,
                codigo_verificacion = NULL,
                fecha_expiracion_codigo = NULL
            WHERE id = $2
            `,
            [passwordHash, usuario.id]
        );
    }
}