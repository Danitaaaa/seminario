import { Persistencia } from '../../persistencia/persistencia';

// El usuario elige el color de su avatar en los proyectos (0 a 9, la paleta del tablero) o null para el automático.
export class ElegirColorAvatar {
    constructor(private readonly persistencia: Persistencia) {}

    async ejecutar(id: number, color: number | null): Promise<void> {
        const filas = await this.persistencia.ejecutar(
            `UPDATE usuarios SET color_avatar = $1 WHERE id_usuario = $2 RETURNING id_usuario`,
            [color, id]
        );
        if (filas.length === 0) throw new Error('El usuario no existe.');
    }
}
