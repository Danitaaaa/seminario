import bcrypt from 'bcrypt';
import { Persistencia } from '../../persistencia/persistencia';
import type { CambiarPasswordActualDto } from './dto';

export class CambiarPasswordActual {
    constructor(private readonly persistencia: Persistencia) {}

    async ejecutar(datos: CambiarPasswordActualDto): Promise<void> {
        const filas = await this.persistencia.ejecutar<{ password_hash: string }>(
            `SELECT password_hash FROM usuarios WHERE id_usuario = $1`,
            [datos.id]
        );
        if (filas.length === 0) throw new Error('El usuario no existe.');

        const valida = await bcrypt.compare(datos.passwordActual, filas[0].password_hash);
        if (!valida) throw new Error('La contraseña actual es incorrecta.');

        const hash = await bcrypt.hash(datos.passwordNueva, 10);
        await this.persistencia.ejecutar(
            `UPDATE usuarios SET password_hash = $1 WHERE id_usuario = $2`,
            [hash, datos.id]
        );
    }
}