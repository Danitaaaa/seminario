import { Persistencia } from '../../persistencia/persistencia';
import type { ModificarPerfilDto } from './dto';
import { COLUMNAS_PERFIL, materializarPerfil, Perfil } from './Perfil';

export class ModificarPerfil {
    constructor(private readonly persistencia: Persistencia) {}

    async ejecutar(datos: ModificarPerfilDto): Promise<Perfil> {
        const repetido = await this.persistencia.ejecutar(
            `SELECT 1 FROM usuarios WHERE email = $1 AND id_usuario <> $2`,
            [datos.email, datos.id]
        );
        if (repetido.length > 0) throw new Error('Ese correo ya está en uso.');

        const filas = await this.persistencia.ejecutar(
            `UPDATE usuarios SET nombre = $1, apellido = $2, email = $3
             WHERE id_usuario = $4
             RETURNING ${COLUMNAS_PERFIL}`,
            [datos.nombre, datos.apellido, datos.email, datos.id]
        );
        if (filas.length === 0) throw new Error('El usuario no existe.');
        return materializarPerfil(filas[0]);
    }
}