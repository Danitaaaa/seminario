import { Persistencia } from '../../persistencia/persistencia';
import type { ObtenerPerfilDto } from './dto';
import { COLUMNAS_PERFIL, materializarPerfil, Perfil } from './perfil';

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

    async getIdGlobal(idUsuario: number): Promise<string | null> {
        const filas = await this.persistencia.ejecutar(
            `SELECT id_global_usuario
            FROM proyecto_miembros
            WHERE id_usuario = $1 AND id_global_usuario IS NOT NULL
            ORDER BY fecha_baja NULLS FIRST, fecha_union DESC
            LIMIT 1`,
            [idUsuario],
        );
        return (filas[0]?.id_global_usuario as string | undefined) ?? null;
    }
}