import { Persistencia } from '../../persistencia/Persistencia';
import { ValidarCodigoDto } from './dto/ValidarCodigo.dto';

export class ValidarCodigo {
    constructor(
        private readonly persistencia: Persistencia
    ) {}

    async ejecutar(
        datos: ValidarCodigoDto
    ): Promise<void> {

        const filas = await this.persistencia.ejecutar(
            `SELECT id, codigo_verificacion, fecha_expiracion_codigo
            FROM usuarios
            WHERE email = $1
            `,
            [datos.email]
        );

        if (filas.length === 0) {
            throw new Error(
                "El correo no está registrado."
            );
        }

        const usuario = filas[0];

        if (usuario.codigo_verificacion !== datos.codigo) {
            throw new Error(
                "Código incorrecto."
            );
        }

        if (new Date(usuario.fecha_expiracion_codigo) < new Date()) {
            throw new Error(
                "El código ha expirado."
            );
        }
    }
}