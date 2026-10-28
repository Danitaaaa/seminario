import { Persistencia } from '../../persistencia/persistencia';

// Pasa a "atrasada" toda sesión "sin_empezar" cuya fecha programada más su duración ya venció
// (verificarSesionesEstudioAtrasadas()). Devuelve la cantidad de sesiones actualizadas.
export class VerificarSesionesEstudioAtrasadas {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(): Promise<number> {
    const filas = await this.persistencia.ejecutar(
      `UPDATE sesion_estudio
          SET estado = 'atrasada'
        WHERE estado = 'sin_empezar'
          AND fecha_programada + make_interval(mins => duracion) < now()
        RETURNING id_sesion_estudio`,
      []
    );
    return filas.length;
  }
}
