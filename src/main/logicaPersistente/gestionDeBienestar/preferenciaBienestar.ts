import { Persistencia } from '../../persistencia/persistencia';
import { CambiarBienestarDTO, UsuarioBienestarDTO } from './dto';

// Si el usuario quiere los avisos de bienestar (por defecto, sí).
export class ObtenerBienestar {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: UsuarioBienestarDTO): Promise<boolean> {
    const filas = await this.persistencia.ejecutar(`SELECT bienestar_activo FROM usuarios WHERE id_usuario = $1`, [datos.usuarioId]);
    return filas[0]?.bienestar_activo !== false;
  }
}

export class CambiarBienestar {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: CambiarBienestarDTO): Promise<boolean> {
    const filas = await this.persistencia.ejecutar(
      `UPDATE usuarios SET bienestar_activo = $1 WHERE id_usuario = $2 RETURNING bienestar_activo`,
      [datos.activo, datos.usuarioId]
    );
    if (!filas.length) throw new Error('El usuario no existe.');
    return filas[0].bienestar_activo;
  }
}
