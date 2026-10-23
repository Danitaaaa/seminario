import bcrypt from 'bcrypt';
import { Persistencia } from '../../persistencia/persistencia';
import { VerificarPassword } from './verificarPassword';
import type { CambiarPasswordActualDto } from './dto';

// Cambia la contraseña cuando el usuario conoce la actual.
// La comprobación de la actual la hace VerificarPassword, así la regla vive en un solo lugar.
export class CambiarPasswordActual {
    constructor(
        private readonly verificarPassword: VerificarPassword,
        private readonly persistencia: Persistencia,
    ) {}

    async ejecutar(datos: CambiarPasswordActualDto): Promise<void> {
        await this.verificarPassword.ejecutar({ id: datos.id, password: datos.passwordActual });

        const hash = await bcrypt.hash(datos.passwordNueva, 10);
        await this.persistencia.ejecutar(
            `UPDATE usuarios SET password_hash = $1 WHERE id_usuario = $2`,
            [hash, datos.id]
        );
    }
}