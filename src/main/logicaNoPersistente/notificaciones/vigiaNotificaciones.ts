import type { Evento } from '../../logicaPersistente/gestionDeEventos/entidades';
import type { Meta } from '../../logicaPersistente/gestionDeMetas/entidades';
import { avisosPendientes } from './avisosPendientes';
import type { Notificador } from './notificador';

export interface FuentesDeAvisos {
  eventos(usuarioId: number, desde: Date): Promise<Evento[]>;
  metas(usuarioId: number): Promise<Meta[]>;
}

// Cada minuto revisa si a la persona que tiene la sesión abierta le toca algún aviso.
export class VigiaNotificaciones {
  private usuarioId: number | null = null;
  private reloj: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly fuentes: FuentesDeAvisos,
    private readonly notificador: Notificador,
    private readonly cadaMs = 60_000,
    private readonly ahora = () => new Date(),
  ) {}

  vigilar(usuarioId: number): Promise<void> {
    if (this.usuarioId !== usuarioId) {
      this.detener();
      this.usuarioId = usuarioId;
      this.reloj = setInterval(() => this.revisar().catch(console.error), this.cadaMs);
    }
    return this.revisar();
  }

  detener(): void {
    if (this.reloj) clearInterval(this.reloj);
    this.reloj = null;
    this.usuarioId = null;
  }

  async revisar(): Promise<void> {
    const usuarioId = this.usuarioId;
    if (!usuarioId) return;
    const ahora = this.ahora();
    const [eventos, metas] = await Promise.all([
      this.fuentes.eventos(usuarioId, ahora),
      this.fuentes.metas(usuarioId),
    ]);
    for (const aviso of avisosPendientes(usuarioId, eventos, metas, ahora)) {
      await this.notificador.notificar(aviso);
    }
  }
}