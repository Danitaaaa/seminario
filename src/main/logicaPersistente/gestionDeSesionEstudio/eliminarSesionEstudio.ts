import { Persistencia } from '../../persistencia/persistencia';

// Elimina una sesión del usuario. Una sesión en curso no se puede eliminar: primero hay que finalizarla.
export class EliminarSesionEstudio {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(idUsuario: number, idSesion: number): Promise<void> {
    const eliminadas = await this.persistencia.ejecutar(
      `DELETE FROM sesion_estudio
        WHERE id_sesion_estudio = $1
          AND id_usuario = $2
          AND estado <> 'en_curso'
        RETURNING id_sesion_estudio`,
      [idSesion, idUsuario]
    );
    if (eliminadas.length === 0) {
      throw new Error('La sesión no existe o está en curso.');
    }
  }
}
