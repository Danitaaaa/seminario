import { Persistencia } from '../../persistencia/persistencia';

// Actualiza el último acceso de la sesión en curso mientras la app está abierta.
// Es la referencia que usa RecuperarSesionInterrumpida si la app se cierra de golpe.
export class RegistrarLatidoSesion {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(idUsuario: number, idSesion: number): Promise<void> {
    await this.persistencia.ejecutar(
      `UPDATE sesion_estudio
          SET fecha_ultimo_acceso = now()
        WHERE id_sesion_estudio = $1
          AND id_usuario = $2
          AND estado = 'en_curso'`,
      [idSesion, idUsuario]
    );
  }
}
