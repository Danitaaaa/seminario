import { EventEmitter } from 'node:events';
import { SesionesEstudio } from '../../administracionDePersistencia/sesionesEstudio';
import { SesionEstudio } from '../../logicaPersistente/gestionDeSesionEstudio/entidades';
import { calcularEstadoPomodoro, EstadoPomodoro } from './pomodoro';

// Canal por el que el main avisa al renderer cada segundo.
export const CANAL_TICK_SESION = 'sesionEstudio:tick';

// Envía un mensaje del main al renderer (en index.ts se implementa con webContents.send).
export type EmitirAlRenderer = (canal: string, datos: unknown) => void;

// Foto del estado de la sesión en curso que recibe el renderer.
export interface SnapshotSesionEnCurso {
  idSesion: number;
  pausada: boolean;
  // Tiempo estudiado: desde el inicio, sin contar las pausas.
  segundosTranscurridos: number;
  segundosPlanificados: number;
  tiempoPlanificadoCumplido: boolean;
  pomodoro: EstadoPomodoro;
}

// Si la app estuvo cerrada más que esto con una sesión corriendo, se la deja pausada.
const SEGUNDOS_MAXIMO_SIN_ACCESO = 5 * 60;
const INTERVALO_TICK_MS = 1000;
const INTERVALO_LATIDO_MS = 30 * 1000;
const INTERVALO_ATRASADAS_MS = 60 * 1000;

// Proceso que corre en el main mientras la app está abierta: es la fuente de verdad del tiempo.
// El renderer solo muestra lo que recibe, así recargar la pantalla no reinicia nada.
// Emite los eventos internos 'inicio', 'fin', 'faseCambio' y 'tiempoCumplido' para que otros módulos se enganchen.
export class ProcesoSesionEstudio extends EventEmitter {
  private sesionSeguida: SesionEstudio | null = null;
  private avisoTiempoCumplidoEnviado = false;
  private completandoFase = false;
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
      setInterval(() => void this.tick(), INTERVALO_TICK_MS),
      setInterval(() => void this.latido(), INTERVALO_LATIDO_MS),
      setInterval(
        () => void this.ejecutarSeguro(() => this.sesiones.verificarSesionesEstudioAtrasadas()),
        INTERVALO_ATRASADAS_MS
      )
    );
  }

  // Empieza a seguir una sesión en curso, o refresca sus datos tras un cambio (pausa, Pomodoro, etc.).
  seguir(sesion: SesionEstudio): void {
    if (sesion.estado !== 'en_curso') {
      if (this.sesionSeguida?.idSesion === sesion.idSesion) this.dejarDeSeguir();
      return;
    }
    const esNueva = this.sesionSeguida?.idSesion !== sesion.idSesion;
    this.sesionSeguida = sesion;
    if (esNueva) {
      this.avisoTiempoCumplidoEnviado = false;
      this.emit('inicio', sesion);
    }
    void this.tick();
  }

  // Deja de seguir la sesión (al finalizarla).
  dejarDeSeguir(): void {
    const sesion = this.sesionSeguida;
    this.sesionSeguida = null;
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

    const ahora = Date.now();
    const hasta = sesion.fechaPausa ? new Date(sesion.fechaPausa).getTime() : ahora;
    const segundosTranscurridos = Math.max(
      0,
      Math.floor((hasta - new Date(sesion.fechaInicio).getTime()) / 1000) - sesion.segundosPausados
    );
    const segundosPlanificados = sesion.duracion * 60;

    return {
      idSesion: sesion.idSesion,
      pausada: sesion.pausada,
      segundosTranscurridos,
      segundosPlanificados,
      tiempoPlanificadoCumplido: segundosTranscurridos >= segundosPlanificados,
      pomodoro: calcularEstadoPomodoro(
        {
          pomodoroMin: sesion.pomodoroMin,
          descansoCortoMin: sesion.descansoCortoMin,
          descansoLargoMin: sesion.descansoLargoMin,
        },
        sesion.pomodoro,
        ahora
      ),
    };
  }

  // Cada segundo calcula el snapshot y lo envía al renderer. Si el Pomodoro llegó a cero,
  // pasa a la siguiente fase (en la base) y avisa con 'faseCambio'.
  private async tick(): Promise<void> {
    const snapshot = this.obtenerSnapshot();
    if (!snapshot) return;

    this.emitir(CANAL_TICK_SESION, snapshot);

    if (snapshot.pomodoro.corriendo && snapshot.pomodoro.segundosRestantes === 0 && !this.completandoFase) {
      await this.completarFase(snapshot.idSesion, snapshot.pomodoro.fase);
    }

    if (snapshot.tiempoPlanificadoCumplido && !this.avisoTiempoCumplidoEnviado) {
      this.avisoTiempoCumplidoEnviado = true;
      this.emit('tiempoCumplido', snapshot);
    }
  }

  private async completarFase(idSesion: number, faseTerminada: string): Promise<void> {
    this.completandoFase = true;
    try {
      const actualizada = await this.sesiones.completarFasePomodoro(idSesion);
      if (actualizada && this.sesionSeguida?.idSesion === idSesion) {
        this.sesionSeguida = actualizada;
        this.emit('faseCambio', faseTerminada, actualizada.pomodoro.fase);
        const snapshot = this.obtenerSnapshot();
        if (snapshot) this.emitir(CANAL_TICK_SESION, snapshot);
      }
    } catch (error) {
      console.error('[ProcesoSesionEstudio]', error);
    } finally {
      this.completandoFase = false;
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
