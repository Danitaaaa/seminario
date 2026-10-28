import { FormEvent, useEffect, useState } from 'react';
import { RotateCcw, Settings } from 'lucide-react';
import type { FasePomodoro, SesionEstudio, SnapshotSesionEnCurso } from '../../types/sesionesEstudio';
import { AnilloProgreso } from './anilloProgreso';
import { ETIQUETA_FASE, estadoPomodoroDeSesion, formatearTiempo } from '../../pages/sesionesEstudio/utilidades';

const FASES: FasePomodoro[] = ['pomodoro', 'descanso_corto', 'descanso_largo'];

export interface ConfiguracionPomodoro {
  pomodoroMin: number;
  descansoCortoMin: number;
  descansoLargoMin: number;
}

interface PanelPomodoroProps {
  sesion: SesionEstudio;
  snapshot: SnapshotSesionEnCurso | null;
  ocupado: boolean;
  onIniciar: () => void;
  onPausar: () => void;
  onReiniciar: () => void;
  onCambiarFase: (fase: FasePomodoro) => void;
  onGuardarConfiguracion: (config: ConfiguracionPomodoro) => Promise<void>;
}

// Panel Pomodoro: pestañas de fase, anillo con el tiempo, reiniciar, START/PAUSE y configuración.
// El tiempo lo calcula el main y llega cada segundo por el tick; acá solo se muestra.
// Si la sesión todavía no empezó, START la inicia y arranca el Pomodoro.
export function PanelPomodoro({
  sesion,
  snapshot,
  ocupado,
  onIniciar,
  onPausar,
  onReiniciar,
  onCambiarFase,
  onGuardarConfiguracion,
}: PanelPomodoroProps) {
  const [configurando, setConfigurando] = useState(false);
  // Mientras no llega el primer tick se calcula localmente, para que el reloj no salte.
  const [ahora, setAhora] = useState(Date.now());

  const delTick = snapshot && snapshot.idSesion === sesion.idSesion && sesion.estado === 'en_curso';
  const estado = delTick ? snapshot.pomodoro : estadoPomodoroDeSesion(sesion, ahora);

  useEffect(() => {
    if (delTick || !estado.corriendo) return;
    const id = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [delTick, estado.corriendo]);

  const completada = sesion.estado === 'completada';
  const pausadaSesion = sesion.pausada;
  const progreso = estado.segundosFase > 0 ? estado.segundosRestantes / estado.segundosFase : 0;
  const numeroEnCiclo = (estado.pomodorosCompletados % 4) + (estado.fase === 'pomodoro' ? 1 : 0) || 4;

  let ayuda = 'Al terminar cada fase pasa sola a la siguiente.';
  if (completada) ayuda = 'La sesión ya terminó.';
  else if (pausadaSesion) ayuda = 'Reanudá la sesión para seguir con el Pomodoro.';
  else if (sesion.estado !== 'en_curso') ayuda = 'START también inicia la sesión.';

  return (
    <div className="pomodoro">
      <div className="pomodoro__fases" role="tablist" aria-label="Fase del Pomodoro">
        {FASES.map((fase) => (
          <button
            key={fase}
            type="button"
            role="tab"
            aria-selected={estado.fase === fase}
            className={`pomodoro__fase${estado.fase === fase ? ' pomodoro__fase--activa' : ''}`}
            disabled={ocupado || completada}
            onClick={() => estado.fase !== fase && onCambiarFase(fase)}
          >
            {ETIQUETA_FASE[fase]}
          </button>
        ))}
      </div>

      <AnilloProgreso progreso={progreso} tamaño={176} grosor={20}>
        <span className="pomodoro__tiempo" aria-live="off">{formatearTiempo(estado.segundosRestantes)}</span>
        <span className="pomodoro__etiqueta">{estado.fase === 'pomodoro' ? 'FOCUS' : 'BREAK'}</span>
      </AnilloProgreso>

      <div className="pomodoro__controles">
        <button
          type="button"
          className="pomodoro__redondo"
          aria-label="Reiniciar"
          title="Reiniciar la fase"
          disabled={ocupado || completada}
          onClick={onReiniciar}
        >
          <RotateCcw size={16} />
        </button>
        <button
          type="button"
          className="pomodoro__start"
          disabled={ocupado || completada || pausadaSesion}
          onClick={estado.corriendo ? onPausar : onIniciar}
        >
          {estado.corriendo ? 'PAUSE' : 'START'}
        </button>
        <button
          type="button"
          className={`pomodoro__redondo${configurando ? ' pomodoro__redondo--activo' : ''}`}
          aria-label="Configurar tiempos"
          title="Configurar tiempos"
          aria-expanded={configurando}
          disabled={completada}
          onClick={() => setConfigurando((v) => !v)}
        >
          <Settings size={16} />
        </button>
      </div>

      <p className="pomodoro__nota">
        {estado.fase === 'pomodoro' ? `Pomodoro ${numeroEnCiclo} de 4` : ETIQUETA_FASE[estado.fase]} · {ayuda}
      </p>

      {configurando && (
        <ConfiguracionTiempos
          inicial={{
            pomodoroMin: sesion.pomodoroMin,
            descansoCortoMin: sesion.descansoCortoMin,
            descansoLargoMin: sesion.descansoLargoMin,
          }}
          onCancelar={() => setConfigurando(false)}
          onGuardar={async (config) => {
            await onGuardarConfiguracion(config);
            setConfigurando(false);
          }}
        />
      )}
    </div>
  );
}

interface ConfiguracionTiemposProps {
  inicial: ConfiguracionPomodoro;
  onCancelar: () => void;
  onGuardar: (config: ConfiguracionPomodoro) => Promise<void>;
}

// Formulario chico del engranaje: minutos de cada fase.
function ConfiguracionTiempos({ inicial, onCancelar, onGuardar }: ConfiguracionTiemposProps) {
  const [config, setConfig] = useState(inicial);
  const [guardando, setGuardando] = useState(false);

  const campo = (clave: keyof ConfiguracionPomodoro, etiqueta: string, max: number) => (
    <label className="pomodoro-config__campo">
      <span>{etiqueta}</span>
      <input
        type="number"
        min={1}
        max={max}
        value={config[clave]}
        onChange={(e) => setConfig((c) => ({ ...c, [clave]: Math.min(max, Math.max(1, Number(e.target.value) || 1)) }))}
      />
    </label>
  );

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setGuardando(true);
    try {
      await onGuardar(config);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="pomodoro-config" onSubmit={enviar}>
      <div className="pomodoro-config__campos">
        {campo('pomodoroMin', 'Pomodoro', 180)}
        {campo('descansoCortoMin', 'Short', 60)}
        {campo('descansoLargoMin', 'Long', 120)}
      </div>
      <span className="pomodoro-config__unidad">Minutos</span>
      <div className="pomodoro-config__acciones">
        <button type="button" className="boton-chico boton-chico--claro" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </button>
        <button type="submit" className="boton-chico" disabled={guardando}>
          Guardar
        </button>
      </div>
    </form>
  );
}
