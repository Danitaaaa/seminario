import type { FasePomodoro, SesionEstudio, SnapshotSesionEnCurso } from '../../types/sesionesEstudio';
import { formatearTiempo } from '../../pages/sesionesEstudio/utilidades';

const ETIQUETA_FASE: Record<FasePomodoro, string> = {
  pomodoro: 'Enfoque',
  descanso_corto: 'Descanso corto',
  descanso_largo: 'Descanso largo',
};

interface PanelPomodoroProps {
  sesion: SesionEstudio;
  snapshot: SnapshotSesionEnCurso | null;
}

// Panel Pomodoro de la pantalla de sesión. Solo muestra lo que calcula el main; no tiene timer propio.
// Sin sesión en curso muestra la duración configurada del pomodoro.
export function PanelPomodoro({ sesion, snapshot }: PanelPomodoroProps) {
  const activo = sesion.estado === 'en_curso' && snapshot?.idSesion === sesion.idSesion;
  const segundos = activo && snapshot ? snapshot.pomodoro.segundosRestantes : sesion.pomodoroMin * 60;
  const segundosFase = activo && snapshot ? snapshot.pomodoro.segundosFase : sesion.pomodoroMin * 60;
  const progreso = segundosFase > 0 ? 1 - segundos / segundosFase : 0;

  return (
    <section className="sesiones__tarjeta">
      <h4 className="sesiones__tarjeta-titulo">Pomodoro</h4>
      <div className="sesiones__reloj">{formatearTiempo(segundos)}</div>
      <div className="sesiones__reloj-fase">
        {activo && snapshot
          ? `${ETIQUETA_FASE[snapshot.pomodoro.fase]} · pomodoro ${snapshot.pomodoro.numeroPomodoro}/4`
          : 'Sin iniciar'}
      </div>
      <div className="sesiones__barra">
        <div className="sesiones__barra-relleno" style={{ width: `${Math.round(progreso * 100)}%` }} />
      </div>
      {activo && snapshot?.tiempoPlanificadoCumplido && (
        <p className="sesiones__nota">Cumpliste el tiempo planificado. Podés finalizar la sesión.</p>
      )}
    </section>
  );
}
