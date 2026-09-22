import { Persistencia } from "../../persistencia/Persistencia";

export class VerificarMail {

    constructor(
        private readonly persistencia: Persistencia
    ) {}

    async ejecutar(
        email: string,
        codigo: string
    ): Promise<void> {

        const filas =
            await this.persistencia.ejecutar(
                `
                SELECT
                    codigo_verificacion,
                    fecha_expiracion_codigo,
                    email_verificado
                FROM usuarios
                WHERE email = $1
                `,
                [email]
            );

        if (filas.length === 0) {
            throw new Error(
                "Usuario no encontrado"
            );
        }

        const usuario = filas[0];

        if (usuario.email_verificado) {
            throw new Error(
                "El correo ya fue verificado"
            );
        }

        if (usuario.codigo_verificacion !== codigo) {
            throw new Error(
                "Código incorrecto"
            );
        }

        if (new Date(usuario.fecha_expiracion_codigo) < new Date()) {
            throw new Error(
                "El código ha expirado"
            );
        }

        await this.persistencia.ejecutar(
            `
            UPDATE usuarios
            SET
                email_verificado = TRUE,
                codigo_verificacion = NULL,
                fecha_expiracion_codigo = NULL
            WHERE email = $1
            `,
            [email]
        );
    }
}