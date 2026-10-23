// Fases del ciclo Pomodoro.
export type FasePomodoro = 'pomodoro' | 'descanso_corto' | 'descanso_largo';

// Duraciones configuradas en la sesión, en minutos.
export interface ConfiguracionPomodoro {
  pomodoroMin: number;
  descansoCortoMin: number;
  descansoLargoMin: number;
}

// Estado del Pomodoro en un instante dado.
export interface EstadoPomodoro {
  fase: FasePomodoro;
  segundosFase: number;
  segundosRestantes: number;
  // Número de pomodoro dentro del ciclo de 4 (1 a 4).
  numeroPomodoro: number;
  pomodorosCompletados: number;
}

// Cantidad de pomodoros antes del descanso largo.
const POMODOROS_POR_CICLO = 4;

// Calcula en qué fase del Pomodoro se está a partir de los segundos transcurridos desde el inicio de la sesión.
// El ciclo es: pomodoro, descanso corto (x3) y, tras el cuarto pomodoro, descanso largo.
// Al depender solo del tiempo transcurrido, no hay contadores en memoria: sobrevive a recargas y reinicios.
export function calcularEstadoPomodoro(
  config: ConfiguracionPomodoro,
  segundosTranscurridos: number
): EstadoPomodoro {
  const segundosPomodoro = config.pomodoroMin * 60;
  const segundosCorto = config.descansoCortoMin * 60;
  const segundosLargo = config.descansoLargoMin * 60;

  const segundosCiclo =
    POMODOROS_POR_CICLO * segundosPomodoro +
    (POMODOROS_POR_CICLO - 1) * segundosCorto +
    segundosLargo;

  const ciclosCompletos = Math.floor(segundosTranscurridos / segundosCiclo);
  let resto = segundosTranscurridos - ciclosCompletos * segundosCiclo;

  for (let numero = 1; numero <= POMODOROS_POR_CICLO; numero++) {
    if (resto < segundosPomodoro) {
      return {
        fase: 'pomodoro',
        segundosFase: segundosPomodoro,
        segundosRestantes: Math.ceil(segundosPomodoro - resto),
        numeroPomodoro: numero,
        pomodorosCompletados: ciclosCompletos * POMODOROS_POR_CICLO + (numero - 1),
      };
    }
    resto -= segundosPomodoro;

    const esUltimo = numero === POMODOROS_POR_CICLO;
    const segundosDescanso = esUltimo ? segundosLargo : segundosCorto;
    if (resto < segundosDescanso) {
      return {
        fase: esUltimo ? 'descanso_largo' : 'descanso_corto',
        segundosFase: segundosDescanso,
        segundosRestantes: Math.ceil(segundosDescanso - resto),
        numeroPomodoro: numero,
        pomodorosCompletados: ciclosCompletos * POMODOROS_POR_CICLO + numero,
      };
    }
    resto -= segundosDescanso;
  }

  // No debería alcanzarse: el resto siempre cae dentro de alguna fase del ciclo.
  return {
    fase: 'pomodoro',
    segundosFase: segundosPomodoro,
    segundosRestantes: segundosPomodoro,
    numeroPomodoro: 1,
    pomodorosCompletados: ciclosCompletos * POMODOROS_POR_CICLO,
  };
}
