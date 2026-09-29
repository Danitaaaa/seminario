import { Persistencia } from '../../persistencia/Persistencia';
import type { RecuperarPasswordDto } from './dto';
import { materializarUsuario } from './MaterializadorUsuarios';
import { enviarCodigoVerificacion } from '../../servicios/Correo';

export class RecuperarPassword {
    constructor(
        private readonly persistencia: Persistencia
    ) {}

    async ejecutar(
        datos: RecuperarPasswordDto
    ): Promise<void>{

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

        const codigoVerificar = Math.floor(100000 + Math.random() * 900000).toString();
        
        const fechaExpiracionCodigo = new Date(Date.now() + 10 * 60 * 1000);

        await this.persistencia.ejecutar(
            `
            UPDATE usuarios
            SET
                codigo_verificacion = $1,
                fecha_expiracion_codigo = $2
            WHERE email = $3
            `,
            [codigoVerificar, fechaExpiracionCodigo, datos.email]
        );

        await enviarCodigoVerificacion(datos.email, codigoVerificar);
    }
}