import { Persistencia } from '../../persistencia/persistencia';
import { SilenciarDTO, UsuarioDTO } from './dto';

// Si el usuario silenció las notificaciones de la compu.
export class ObtenerSilencio {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: UsuarioDTO): Promise<boolean> {
    const filas = await this.persistencia.ejecutar(
      `SELECT notificaciones_silenciadas FROM usuarios WHERE id_usuario = $1`,
      [datos.usuarioId]
    );
    return filas[0]?.notificaciones_silenciadas === true;
  }
}

export class CambiarSilencio {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: SilenciarDTO): Promise<boolean> {
    const filas = await this.persistencia.ejecutar(
      `UPDATE usuarios SET notificaciones_silenciadas = $1 WHERE id_usuario = $2
       RETURNING notificaciones_silenciadas`,
      [datos.silenciadas, datos.usuarioId]
    );
    if (!filas.length) throw new Error('El usuario no existe.');
    return filas[0].notificaciones_silenciadas;
  }
}