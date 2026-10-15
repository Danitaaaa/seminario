import { Persistencia } from '../../persistencia/persistencia';
import type { EliminarUsuarioDto } from './dto';

export class EliminarUsuario {
    constructor(private readonly persistencia: Persistencia) {}

    async ejecutar({ id }: EliminarUsuarioDto): Promise<void> {
        await this.persistencia.ejecutar(`DELETE FROM categorias WHERE usuario_id = $1`, [id]);
        await this.persistencia.ejecutar(`DELETE FROM usuarios WHERE id_usuario = $1`, [id]);
    }
}