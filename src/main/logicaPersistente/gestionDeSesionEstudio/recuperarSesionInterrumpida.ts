import { Persistencia } from '../../persistencia/persistencia';

// Recupera las sesiones que quedaron "en_curso" corriendo porque la app se cerró hace mucho.
// En vez de cerrarlas, las deja pausadas en el último acceso registrado: no se cuenta tiempo
// que no se estudió y el usuario puede reanudarlas o finalizarlas cuando vuelve.
// El Pomodoro se detiene con los segundos que le quedaban en ese momento.
// Las sesiones con acceso reciente se dejan como estaban (se cerró y abrió la app enseguida).
export class RecuperarSesionInterrumpida {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(segundosMaximoSinAcceso: number): Promise<number> {
    const filas = await this.persistencia.ejecutar(
      `UPDATE sesion_estudio
          SET fecha_pausa = GREATEST(fecha_ultimo_acceso, fecha_inicio),
              pomodoro_restante_seg = CASE
                WHEN pomodoro_corriendo_desde IS NULL THEN pomodoro_restante_seg
                ELSE GREATEST(0,
                  COALESCE(pomodoro_restante_seg,
                    CASE pomodoro_fase
                      WHEN 'pomodoro' THEN pomodoro_min
                      WHEN 'descanso_corto' THEN descanso_corto_min
                      ELSE descanso_largo_min
                    END * 60)
                  - GREATEST(0, floor(extract(epoch FROM fecha_ultimo_acceso - pomodoro_corriendo_desde))::int)
                )
              END,
              pomodoro_corriendo_desde = NULL
        WHERE estado = 'en_curso'
          AND fecha_pausa IS NULL
          AND fecha_ultimo_acceso < now() - make_interval(secs => $1::int)
        RETURNING id_sesion_estudio`,
      [segundosMaximoSinAcceso]
    );
    return filas.length;
  }
}
