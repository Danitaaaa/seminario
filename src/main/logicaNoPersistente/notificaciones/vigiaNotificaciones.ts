import type { Evento } from '../../logicaPersistente/gestionDeEventos/entidades';
import type { Meta } from '../../logicaPersistente/gestionDeMetas/entidades';
import { avisosPendientes } from './avisosPendientes';
import type { Notificador } from './notificador';

export interface FuentesDeAvisos {
  eventos(usuarioId: number, desde: Date): Promise<Evento[]>;
  // Metas personales que vencen el día indicado (AAAA-MM-DD).
  metas(usuarioId: number, dia: string): Promise<Meta[]>;
}

const dosCifras = (n: number) => String(n).padStart(2, '0');
const diaDe = (d: Date) => `${d.getFullYear()}-${dosCifras(d.getMonth() + 1)}-${dosCifras(d.getDate())}`;

function avisarFallo<T>(fuente: string, error: unknown, vacio: T): T {
  console.error(`[avisos] No se pudieron leer las ${fuente} para los recordatorios:`, error);
  return vacio;
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
    // Cada fuente por separado: si falla una (por ejemplo, a la base le falta una columna),
    // los avisos de la otra siguen saliendo y el error queda en la terminal.
    const [eventos, metas] = await Promise.all([
      this.fuentes.eventos(usuarioId, ahora).catch((e) => avisarFallo('eventos', e, [] as Evento[])),
      this.fuentes.metas(usuarioId, diaDe(ahora)).catch((e) => avisarFallo('metas', e, [] as Meta[])),
    ]);
    for (const aviso of avisosPendientes(usuarioId, eventos, metas, ahora)) {
      await this.notificador.notificar(aviso);
    }
  }
}