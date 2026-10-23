import { EventEmitter } from 'node:events';
import { SesionesEstudio } from '../../administracionDePersistencia/sesionesEstudio';
import { SesionEstudio } from '../../logicaPersistente/gestionDeSesionEstudio/entidades';
import { calcularEstadoPomodoro, EstadoPomodoro, FasePomodoro } from './pomodoro';

// Canal por el que el main avisa al renderer cada segundo.
export const CANAL_TICK_SESION = 'sesionEstudio:tick';

// Envía un mensaje del main al renderer (en index.ts se implementa con webContents.send).
export type EmitirAlRenderer = (canal: string, datos: unknown) => void;

// Foto del estado de la sesión en curso que recibe el renderer.
export interface SnapshotSesionEnCurso {
  idSesion: number;
  segundosTranscurridos: number;
  segundosPlanificados: number;
  tiempoPlanificadoCumplido: boolean;
  pomodoro: EstadoPomodoro;
}

// Si la app estuvo cerrada más que esto con una sesión en curso, se la da por interrumpida.
const SEGUNDOS_MAXIMO_SIN_ACCESO = 5 * 60;
const INTERVALO_TICK_MS = 1000;
const INTERVALO_LATIDO_MS = 30 * 1000;
const INTERVALO_ATRASADAS_MS = 60 * 1000;

// Proceso que corre en el main mientras la app está abierta: es la fuente de verdad del tiempo.
// El renderer solo muestra lo que recibe, así recargar la pantalla no reinicia nada.
// Emite los eventos internos 'inicio', 'fin' y 'faseCambio' para que otros módulos (Spotify) se enganchen.
export class ProcesoSesionEstudio extends EventEmitter {
  private sesionSeguida: SesionEstudio | null = null;
  private faseAnterior: FasePomodoro | null = null;
  private avisoTiempoCumplidoEnviado = false;
  private temporizadores: NodeJS.Timeout[] = [];

  constructor(
    private readonly sesiones: SesionesEstudio,
    private readonly emitir: EmitirAlRenderer
  ) {
    super();
  }

  // Arranca los procesos: recupera sesiones interrumpidas, marca atrasadas y programa los intervalos.
  async arrancar(): Promise<void> {
    await this.ejecutarSeguro(() =>
      this.sesiones.recuperarSesionInterrumpida(SEGUNDOS_MAXIMO_SIN_ACCESO)
    );
    await this.ejecutarSeguro(() => this.sesiones.verificarSesionesEstudioAtrasadas());

    this.temporizadores.push(
      setInterval(() => this.tick(), INTERVALO_TICK_MS),
      setInterval(() => void this.latido(), INTERVALO_LATIDO_MS),
      setInterval(
        () => void this.ejecutarSeguro(() => this.sesiones.verificarSesionesEstudioAtrasadas()),
        INTERVALO_ATRASADAS_MS
      )
    );
  }

  // Empieza a seguir una sesión en curso (al iniciarla o al reabrir la app con una en curso).
  seguir(sesion: SesionEstudio): void {
    const esNueva = this.sesionSeguida?.idSesion !== sesion.idSesion;
    this.sesionSeguida = sesion;
    if (esNueva) {
      this.faseAnterior = null;
      this.avisoTiempoCumplidoEnviado = false;
      this.emit('inicio', sesion);
    }
    this.tick();
  }

  // Deja de seguir la sesión (al finalizarla).
  dejarDeSeguir(): void {
    const sesion = this.sesionSeguida;
    this.sesionSeguida = null;
    this.faseAnterior = null;
    if (sesion) this.emit('fin', sesion);
  }

  // Detiene todos los intervalos (al cerrar la app).
  detener(): void {
    this.temporizadores.forEach(clearInterval);
    this.temporizadores = [];
  }

  // Devuelve la foto actual de la sesión seguida, o null si no hay ninguna.
  obtenerSnapshot(): SnapshotSesionEnCurso | null {
    const sesion = this.sesionSeguida;
    if (!sesion || !sesion.fechaInicio) return null;

    const segundosTranscurridos = Math.max(
      0,
      Math.floor((Date.now() - new Date(sesion.fechaInicio).getTime()) / 1000)
    );
    const segundosPlanificados = sesion.duracion * 60;

    return {
      idSesion: sesion.idSesion,
      segundosTranscurridos,
      segundosPlanificados,
      tiempoPlanificadoCumplido: segundosTranscurridos >= segundosPlanificados,
      pomodoro: calcularEstadoPomodoro(
        {
          pomodoroMin: sesion.pomodoroMin,
          descansoCortoMin: sesion.descansoCortoMin,
          descansoLargoMin: sesion.descansoLargoMin,
        },
        segundosTranscurridos
      ),
    };
  }

  // Cada segundo calcula el snapshot, lo envía al renderer y avisa los cambios de fase.
  private tick(): void {
    const snapshot = this.obtenerSnapshot();
    if (!snapshot) return;

    this.emitir(CANAL_TICK_SESION, snapshot);

    if (snapshot.pomodoro.fase !== this.faseAnterior) {
      const huboFaseAnterior = this.faseAnterior !== null;
      this.faseAnterior = snapshot.pomodoro.fase;
      if (huboFaseAnterior) this.emit('faseCambio', snapshot.pomodoro.fase, snapshot);
    }

    if (snapshot.tiempoPlanificadoCumplido && !this.avisoTiempoCumplidoEnviado) {
      this.avisoTiempoCumplidoEnviado = true;
      this.emit('tiempoCumplido', snapshot);
    }
  }

  // Registra que la app sigue abierta con una sesión en curso (referencia para la recuperación).
  private async latido(): Promise<void> {
    const sesion = this.sesionSeguida;
    if (!sesion) return;
    await this.ejecutarSeguro(() => this.sesiones.registrarLatido(sesion.idUsuario, sesion.idSesion));
  }

  // Ejecuta una tarea de fondo sin dejar que un error de base de datos tumbe el proceso.
  private async ejecutarSeguro(tarea: () => Promise<unknown>): Promise<void> {
    try {
      await tarea();
    } catch (error) {
      console.error('[ProcesoSesionEstudio]', error);
    }
  }
}
