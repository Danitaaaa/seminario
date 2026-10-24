// Fases del ciclo Pomodoro.
export type FasePomodoro = 'pomodoro' | 'descanso_corto' | 'descanso_largo';

// Duraciones configuradas en la sesión, en minutos.
export interface ConfiguracionPomodoro {
  pomodoroMin: number;
  descansoCortoMin: number;
  descansoLargoMin: number;
}

// Estado del Pomodoro tal como está guardado en la sesión.
export interface PomodoroGuardado {
  fase: FasePomodoro;
  restanteSeg: number | null;
  corriendoDesde: Date | string | null;
  completados: number;
}

// Estado del Pomodoro en un instante dado (lo que se muestra en pantalla).
export interface EstadoPomodoro {
  fase: FasePomodoro;
  segundosFase: number;
  segundosRestantes: number;
  corriendo: boolean;
  pomodorosCompletados: number;
}

// Duración en segundos de una fase según la configuración.
export function segundosDeFase(config: ConfiguracionPomodoro, fase: FasePomodoro): number {
  if (fase === 'pomodoro') return config.pomodoroMin * 60;
  if (fase === 'descanso_corto') return config.descansoCortoMin * 60;
  return config.descansoLargoMin * 60;
}

// Calcula los segundos restantes a partir de lo guardado: si está corriendo descuenta el tiempo
// transcurrido desde el START. Al depender solo de datos persistidos, sobrevive a recargas y reinicios.
export function calcularEstadoPomodoro(
  config: ConfiguracionPomodoro,
  guardado: PomodoroGuardado,
  ahoraMs: number = Date.now()
): EstadoPomodoro {
  const segundosFase = segundosDeFase(config, guardado.fase);
  const base = guardado.restanteSeg ?? segundosFase;
  const corriendo = guardado.corriendoDesde !== null;
  const transcurridos = corriendo
    ? Math.max(0, Math.floor((ahoraMs - new Date(guardado.corriendoDesde as string).getTime()) / 1000))
    : 0;

  return {
    fase: guardado.fase,
    segundosFase,
    segundosRestantes: Math.max(0, base - transcurridos),
    corriendo,
    pomodorosCompletados: guardado.completados,
  };
}
