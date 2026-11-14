// src/main/logicaNoPersistente/ia/RouterModelos.ts
import { ErrorAbortado, ErrorProveedor, ErrorRouter, clasificar } from './errores.js';
import type { Causa } from './errores.js';
import type { PedidoGeneracion, ProveedorModelo, ResultadoGeneracion, Tarea } from './tipos.js';

export interface OpcionesRouter {
  /** Cadena por tarea: el primero es el principal, los demás son respaldo. */
  cadenas: Record<Tarea, string[]>;
  /** En Electron: () => net.isOnline() */
  hayInternet: () => boolean | Promise<boolean>;
  /** Reintentos si el JSON no valida (0 = ninguno). Default 1. */
  reintentosSalida?: number;
  /** Tiempo máximo por intento, por tipo. Default: online 60 s, local 180 s. */
  timeoutMs?: { online: number; local: number };
  /** Tras fallar por red/cuota/auth/timeout, no insistir con ese proveedor por este tiempo. Default 60 s. */
  enfriamientoMs?: number;
  /** Reloj inyectable (los tests lo adelantan sin esperar de verdad). */
  ahora?: () => number;
  /** Para loguear / mostrar "usando Gemini…" en la UI. */
  alEvento?: (e: EventoRouter) => void;
}

export type EventoRouter =
  | { tipo: 'intento'; tarea: Tarea; proveedor: string }
  | { tipo: 'omitido'; tarea: Tarea; proveedor: string; motivo: string }
  | { tipo: 'fallo'; tarea: Tarea; proveedor: string; causa: string };

/** Causas por las que insistir enseguida es inútil → "circuit breaker". */
const ENFRIAN: ReadonlySet<Causa> = new Set(['red', 'cuota', 'auth', 'timeout', 'sin_clave']);

export class RouterModelos {
  private readonly porId: Map<string, ProveedorModelo>;
  private readonly enfriandoHasta = new Map<string, number>(); // id → timestamp

  constructor(
    proveedores: ProveedorModelo[],
    private readonly opciones: OpcionesRouter,
  ) {
    this.porId = new Map(proveedores.map((p) => [p.id, p]));
  }

  private ahora(): number {
    return (this.opciones.ahora ?? Date.now)();
  }

  async generar<T>(tarea: Tarea, pedido: PedidoGeneracion<T>): Promise<ResultadoGeneracion<T>> {
    const online = await this.opciones.hayInternet();
    const fallos: ErrorProveedor[] = [];

    for (const id of this.opciones.cadenas[tarea]) {
      pedido.signal?.throwIfAborted(); // si el usuario canceló, no seguimos

      const proveedor = this.porId.get(id);
      if (!proveedor) continue;

      if (proveedor.tipo === 'online' && !online) {
        this.opciones.alEvento?.({ tipo: 'omitido', tarea, proveedor: id, motivo: 'sin internet' });
        continue;
      }
      if ((this.enfriandoHasta.get(id) ?? 0) > this.ahora()) {
        this.opciones.alEvento?.({ tipo: 'omitido', tarea, proveedor: id, motivo: 'en enfriamiento' });
        continue;
      }
      if (!(await proveedor.disponible())) {
        this.opciones.alEvento?.({ tipo: 'omitido', tarea, proveedor: id, motivo: 'no disponible' });
        continue;
      }

      this.opciones.alEvento?.({ tipo: 'intento', tarea, proveedor: id });
      try {
        const r = await this.intentar(proveedor, pedido);
        this.enfriandoHasta.delete(id); // volvió a andar
        return r;
      } catch (e) {
        if (pedido.signal?.aborted) throw new ErrorAbortado(); // cancelar NO activa el respaldo
        const err = clasificar(e, id);
        if (err.causa === 'abortado') throw e;
        fallos.push(err);
        if (ENFRIAN.has(err.causa))
          this.enfriandoHasta.set(id, this.ahora() + (this.opciones.enfriamientoMs ?? 60_000));
        this.opciones.alEvento?.({ tipo: 'fallo', tarea, proveedor: id, causa: err.causa });
      }
    }
    throw new ErrorRouter(fallos);
  }

  /** Botón "Probar conexión" de Ajustes: un pedido mínimo, sin respaldo ni enfriamiento. */
  async probar(id: string, signal?: AbortSignal): Promise<{ ok: boolean; ms: number; causa?: string }> {
    const p = this.porId.get(id);
    const inicio = this.ahora();
    if (!p) return { ok: false, ms: 0, causa: 'desconocido' };
    try {
      await p.generarJson({
        sistema: 'Respondé SOLO con el JSON {"ok": true}.',
        usuario: 'ping',
        esquemaJson: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'], additionalProperties: false },
        signal: this.conTimeout(p, signal).senal,
      });
      return { ok: true, ms: this.ahora() - inicio };
    } catch (e) {
      return { ok: false, ms: this.ahora() - inicio, causa: clasificar(e, id).causa };
    }
  }

  /** Une la señal del usuario con un timeout. Si cualquiera se dispara, la llamada se corta. */
  private conTimeout(p: ProveedorModelo, usuario?: AbortSignal) {
    const t = this.opciones.timeoutMs ?? { online: 60_000, local: 180_000 };
    const tiempo = AbortSignal.timeout(p.tipo === 'online' ? t.online : t.local);
    return { tiempo, senal: usuario ? AbortSignal.any([usuario, tiempo]) : tiempo };
  }

  /** Un proveedor, con reintentos solo si la SALIDA no es válida. */
  private async intentar<T>(proveedor: ProveedorModelo, pedido: PedidoGeneracion<T>): Promise<ResultadoGeneracion<T>> {
    const maxIntentos = 1 + (this.opciones.reintentosSalida ?? 1);
    const inicio = this.ahora();
    let usuario = pedido.usuario;
    let ultimoMotivo = '';

    for (let intento = 1; intento <= maxIntentos; intento++) {
      const { tiempo, senal } = this.conTimeout(proveedor, pedido.signal);
      let texto: string;
      try {
        texto = await proveedor.generarJson({
          sistema: pedido.sistema,
          usuario,
          esquemaJson: pedido.esquemaJson,
          signal: senal,
          ...(pedido.imagenes?.length ? { imagenes: pedido.imagenes } : {}),
        });
      } catch (e) {
        // Se cortó por NUESTRO timeout (no por el usuario): lo contamos como timeout, no como cancelación.
        if (tiempo.aborted && !pedido.signal?.aborted)
          throw new ErrorProveedor('timeout', proveedor.id, 'El proveedor tardó demasiado', { cause: e });
        throw e;
      }

      try {
        const dato = pedido.esquema.parse(JSON.parse(extraerJson(texto)));
        return { dato, proveedor: proveedor.id, ms: this.ahora() - inicio, intentos: intento };
      } catch (e) {
        ultimoMotivo = e instanceof Error ? e.message : String(e);
        usuario =
          pedido.usuario +
          `\n\n[CORRECCIÓN] Tu respuesta anterior no cumplió el formato: ${ultimoMotivo.slice(0, 500)}\n` +
          'Respondé SOLO con JSON válido según el esquema.';
      }
    }
    throw new ErrorProveedor('salida_invalida', proveedor.id, `JSON inválido: ${ultimoMotivo}`);
  }
}

/** Algunos modelos envuelven el JSON en ```json … ```; lo sacamos. */
export function extraerJson(texto: string): string {
  const t = texto.trim();
  const m = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(t);
  return m?.[1] ?? t;
}