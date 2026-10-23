import { Persistencia } from '../../persistencia/persistencia';

// Cierra las sesiones que quedaron "en_curso" porque la app se cerró hace mucho.
// La fecha de fin se fija en el último acceso registrado, para no contar tiempo que no se estudió.
// GREATEST evita violar el CHECK (fecha_fin >= fecha_inicio) si el acceso quedó anterior al inicio.
// Las sesiones con acceso reciente se dejan en curso: el Pomodoro se recalcula desde fecha_inicio.
export class RecuperarSesionInterrumpida {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(segundosMaximoSinAcceso: number): Promise<number> {
    const filas = await this.persistencia.ejecutar(
      `UPDATE sesion_estudio
          SET estado = 'completada',
              fecha_fin = GREATEST(fecha_ultimo_acceso, fecha_inicio)
        WHERE estado = 'en_curso'
          AND fecha_ultimo_acceso < now() - make_interval(secs => $1::int)
        RETURNING id_sesion_estudio`,
      [segundosMaximoSinAcceso]
    );
    return filas.length;
  }
}
