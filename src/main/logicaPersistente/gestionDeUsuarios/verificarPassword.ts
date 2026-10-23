import bcrypt from 'bcrypt';
import { Persistencia } from '../../persistencia/persistencia';
import type { VerificarPasswordDto } from './dto';

// Confirma que la contraseña sea la del usuario antes de una acción sensible.
export class VerificarPassword {
    constructor(private readonly persistencia: Persistencia) {}

    async ejecutar(datos: VerificarPasswordDto): Promise<void> {
        const filas = await this.persistencia.ejecutar<{ password_hash: string }>(
            `SELECT password_hash FROM usuarios WHERE id_usuario = $1`,
            [datos.id]
        );
        if (filas.length === 0) throw new Error('El usuario no existe.');

        const valida = await bcrypt.compare(datos.password, filas[0].password_hash);
        if (!valida) throw new Error('La contraseña es incorrecta.');
    }
}