import { Persistencia } from '../../persistencia/persistencia';
import type { ObtenerPerfilDto } from './dto';
import { COLUMNAS_PERFIL, materializarPerfil, Perfil } from './Perfil';

export class ObtenerPerfil {
    constructor(private readonly persistencia: Persistencia) {}

    async ejecutar({ id }: ObtenerPerfilDto): Promise<Perfil> {
        const filas = await this.persistencia.ejecutar(
            `SELECT ${COLUMNAS_PERFIL} FROM usuarios WHERE id_usuario = $1`,
            [id]
        );
        if (filas.length === 0) throw new Error('El usuario no existe.');
        return materializarPerfil(filas[0]);
    }
}